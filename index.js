const nopeRedis = require('./nope-redis');
const {
	parseWithTimezone,
	getTimezoneOffset,
	absFloor,
	duration,
	padZero,
	checkTimezone,
	getTimezoneInfo,
	convertToTimezone,
	getAvailableTimezones,
	isDST,
	getTimezoneAbbreviation,
	dateTimeFormat,
	converter,
	isValidMonth,
	tryParseTextDate,
	num2,
	num4,
	getOrdinal,
	getCompiledTemplate,
	getDayOfWeek,
	getDayOfYear,
	getIsoWeekInfo,
	getLocaleWeekInfo,
	getTimezoneLongName,
	format_validators,
	validateDynamicTemplate,
	offsetAt,
	toWallClock,
	wallClockToInstant,
	systemOffsetAt,
	daysInMonth,
	ensureToday,
	parseToday,
	hasExplicitZone,
	nativeZoneKind,
	closedEngineText,
	ZONE_EXPLICIT,
	ZONE_UTC_DATE,
	localFromFields,
	takeParsedWall,
	takeLocaleNamesUsed,
	takeParsedToday,
	resetParseCapture,
	configuredLanguage,
	recordParsedWall,
	setWallCapture,
	captureWallForParse,
	isWallCaptureEnabled,
	parseTemplateFields,
	strictTemplateCheck,
	boundedSet,
	isUtcZone,
	isNameOfForm,
	getWeekdayIndex,
	isValidDayName,
	getMonthNumber,
} = require('./functions');
const {
	cached_dateTimeFormat,
	format_types,
	timeInMilliseconds,
	format_types_regex,
	global_config,
	format_types_regex_cache,
	formatter_cache,
	format_part_types,
	format_derived_flags,
	systemTimezone,
} = require('./constants');

nopeRedis.config({ defaultTtl: 1300 });

// Hoisted 'dddd' sentinel so the static isValid fast path is a single identity compare
// instead of a property load on every call (the detection ladder calls isValid per rung).
const TEMPLATE_DDDD = format_types.dddd;

// Mirrors nope-redis service status. When caching is disabled (the default), we skip all
// cache reads/writes so no cache-key string, Date clone, or Promise is allocated on the hot path.
let cachingEnabled = false;

// Shared frozen per-instance config: most instances never call config()/tz()/fromNow(), so the
// constructor assigns this sentinel instead of allocating a fresh { rtf: {} } per instance.
// Readers behave exactly as with a fresh object (every property is undefined); the few methods
// that write per-instance config go through ownTempConfig() first (copy-on-write).
const EMPTY_RTF = Object.freeze({});
const EMPTY_TEMP_CONFIG = Object.freeze({ timezone: undefined, locale: undefined, weekStartDay: undefined, rtf: EMPTY_RTF });

/**
 * Copy-on-write escape from the shared temp_config sentinel; call before any temp_config write.
 *
 * @param {KkDate} kkDate
 * @returns {object} the instance's own (writable) temp_config
 */
function ownTempConfig(kkDate) {
	if (kkDate.temp_config === EMPTY_TEMP_CONFIG) {
		kkDate.temp_config = { timezone: undefined, locale: undefined, weekStartDay: undefined, rtf: {} };
	}
	return kkDate.temp_config;
}

// True only while the global timezone differs from the system timezone — the single case where
// the constructor's parseWithTimezone() call can change the date. Kept in sync by config() and
// setTimezone() so the constructor can skip that call entirely in the default configuration.
let timezone_shift_enabled = global_config.timezone !== systemTimezone;

/**
 * Parsers record the requested wall clock (see localFromFields) only while it can be needed: when
 * the global timezone differs from the system one, and for parses the constructor caches (a cached
 * parse must still reinterpret exactly if the global timezone changes later; see the constructor).
 */
function updateWallCapture() {
	setWallCapture(timezone_shift_enabled);
}
updateWallCapture();

/**
 * new Date(text) for a naive date string (it carries no zone), which the engine reads as local
 * time. When the wall clock is captured (see localFromFields), the same text read as UTC is
 * recorded as the wall clock it denotes: the local Date has moved forward if the system zone
 * skips that time (DST gap).
 *
 * @param {string} text
 * @returns {Date}
 */
function nativeLocalDate(text) {
	const date = new Date(text);
	if (!Number.isNaN(date.getTime())) {
		recordNativeWall(text);
	}
	return date;
}

/**
 * Records the wall clock a naive string the engine parsed denotes (the same text read as UTC), when
 * the wall clock is captured (see localFromFields).
 *
 * @param {string} text
 */
function recordNativeWall(text) {
	if (isWallCaptureEnabled()) {
		// ' UTC' for the engine's legacy forms, 'Z' for an ES5 date-time ("2024-01-15T10:00"), appended
		// to the text the engine actually reads (see closedEngineText)
		const source = closedEngineText(text);
		let wall = Date.parse(`${source} UTC`);
		if (Number.isNaN(wall)) {
			wall = Date.parse(`${source}Z`);
		}
		if (!Number.isNaN(wall)) {
			recordParsedWall(wall);
		}
	}
}

/**
 * Builds a local-time Date from already-split numeric date parts using the numeric Date
 * constructor, which skips the engine's (much slower) string date parser.
 *
 * Guarded on a 4-digit year: the parse regexes' `(|17|18|19|20|21)\d\d` empty-alternative also
 * matches 2-digit years, for which the numeric constructor maps to 19xx and would accept inputs
 * that the legacy string form rejects. 2-digit years fall back to the exact legacy string so
 * behavior is preserved.
 *
 * @param {string} year
 * @param {string} month - 1-based month
 * @param {string} day
 * @returns {Date}
 */
function fastLocalDate(year, month, day) {
	if (year.length === 4) {
		return localFromFields(+year, +month - 1, +day, 0, 0, 0, 0);
	}
	return nativeLocalDate(`${year}-${month}-${day} 00:00:00`);
}

/**
 * Two ASCII digits at offset i as an int. Only called on strings whose shape was already
 * confirmed by a template validator, so no digit re-checking is needed.
 *
 * @param {string} s
 * @param {number} i
 * @returns {number}
 */
function cc2(s, i) {
	return (s.charCodeAt(i) - 48) * 10 + (s.charCodeAt(i + 1) - 48);
}

/**
 * Four ASCII digits at offset i as an int (validated shapes only).
 *
 * @param {string} s
 * @param {number} i
 * @returns {number}
 */
function cc4(s, i) {
	return cc2(s, i) * 100 + cc2(s, i + 2);
}

/**
 * Like {@link fastLocalDate} but with a time component. `timePart` is the raw "HH:mm[:ss]" slice;
 * seconds default to 0 when absent. Same 4-digit-year guard and legacy fallback.
 *
 * @param {string} year
 * @param {string} month - 1-based month
 * @param {string} day
 * @param {string} timePart - "HH:mm" or "HH:mm:ss"
 * @returns {Date}
 */
function fastLocalDateTime(year, month, day, timePart) {
	if (year.length === 4) {
		const [h, mi, s] = timePart.split(':');
		return localFromFields(+year, +month - 1, +day, +h, +mi || 0, +s || 0, 0);
	}
	return nativeLocalDate(`${year}-${month}-${day}T${timePart}`);
}

/**
 * @class KkDate
 * @description A utility class for date parsing, validation, and formatting.
 * Accepts various input types (string, Date, KkDate) and supports multiple date formats
 * like "YYYY-MM-DD" or "YYYY-DD-MM".
 */

// ---------------------------------------------------------------------------
// Constructor auto-detection
//
// String inputs are routed by (length, separator charCode) so each input runs at most a
// couple of template validators instead of walking a long rung ladder. The validators are
// the same `format_validators` the ladder used — acceptance is unchanged — and every shape
// the fast paths decline falls through to `parseTextLegacy`, which keeps the original
// regex rung chain and the native `new Date(string)` fallback verbatim.
// ---------------------------------------------------------------------------

/**
 * Parses bare time-of-day strings onto today's date in a single charCode pass (no split()).
 * Acceptance is bit-identical to the legacy validator/regex set:
 *   24-hour "HH:mm[:ss[.SSS]]" with hours 00-29 (24+ rolls into the next day),
 *   12-hour "hh:mm[:ss[.SSS]] AM|PM" with hours 01-12 (uppercase meridiem only).
 * Everything else returns false and must keep falling through — e.g. "12:30:60" reaches the
 * native parser, which reads ":60" as a 2-digit year (locked legacy behavior).
 *
 * detected_format quirks are load-bearing (tests and timezone reinterpretation key off them):
 * zero seconds report 'HH:mm' ("14:30:00", "02:30 PM" and "02:30:00 PM" all detect as
 * 'HH:mm'), and ".000" milliseconds do not count as a .SSS match.
 *
 * @param {KkDate} kk
 * @param {string} s - string with ":" at index 2 and length <= 15
 * @param {number} len
 * @returns {boolean}
 */
function parseTimeOnly(kk, s, len) {
	let hours = num2(s, 0);
	const minutes = num2(s, 3);
	if (hours < 0 || minutes < 0 || minutes > 59) {
		return false;
	}
	let seconds = 0;
	let hasSeconds = false;
	let milliseconds = 0;
	let end = 5; // index just past "HH:mm"
	if (len >= 8 && s.charCodeAt(5) === 58) {
		seconds = num2(s, 6);
		if (seconds < 0 || seconds > 59) {
			return false;
		}
		hasSeconds = true;
		end = 8;
		if (len >= 12 && s.charCodeAt(8) === 46) {
			const msHi = num2(s, 9);
			const msLo = s.charCodeAt(11) - 48;
			if (msHi < 0 || msLo < 0 || msLo > 9) {
				return false;
			}
			milliseconds = msHi * 10 + msLo;
			end = 12;
		}
	}
	let isTwelveHour = false;
	if (end !== len) {
		// Only a literal " AM"/" PM" tail may remain (12-hour forms).
		if (len !== end + 3 || s.charCodeAt(end) !== 32 || s.charCodeAt(end + 2) !== 77 || hours < 1 || hours > 12) {
			return false;
		}
		const meridiem = s.charCodeAt(end + 1);
		if (meridiem === 65) {
			if (hours === 12) {
				hours = 0;
			}
		} else if (meridiem === 80) {
			if (hours !== 12) {
				hours += 12;
			}
		} else {
			return false;
		}
		isTwelveHour = true;
	} else if (hours > 29) {
		return false;
	}
	const today = parseToday();
	// Hours 24-29 spill into the following day through the day argument — the same
	// normalization the legacy setDate() + setHours() pair produced.
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = localFromFields(today.year, today.month, today.day + extraDay, hours - extraDay * 24, minutes, seconds, milliseconds);
	if (milliseconds !== 0) {
		kk.detected_format = isTwelveHour ? format_types['hh:mm:ss.SSS'] : format_types['HH:mm:ss.SSS'];
	} else if (hasSeconds && seconds !== 0) {
		kk.detected_format = isTwelveHour ? format_types['hh:mm:ss'] : format_types['HH:mm:ss'];
	} else {
		kk.detected_format = format_types['HH:mm'];
	}
	return true;
}

/**
 * Exact-shape ISO parser built straight from charCodes:
 *   len 19 "YYYY-MM-DDTHH:mm:ss"      → local time (utc = false)
 *   len 20 "YYYY-MM-DDTHH:mm:ssZ"     → UTC
 *   len 24 "YYYY-MM-DDTHH:mm:ss.SSSZ" → UTC
 * Day overflow rolls exactly like the native parser; the shapes where native semantics
 * differ from the numeric constructors (month 13, hour 24, year < 100 two-digit mapping)
 * return false so the caller's native `new Date(string)` keeps producing the locked result.
 *
 * @param {KkDate} kk
 * @param {string} s
 * @param {number} len - 19, 20 or 24 (already checked by the caller)
 * @param {boolean} utc
 * @returns {boolean}
 */
function parseIsoExact(kk, s, len, utc) {
	if (s.charCodeAt(13) !== 58 || s.charCodeAt(16) !== 58) {
		return false;
	}
	const year = num4(s, 0);
	const month = num2(s, 5);
	const day = num2(s, 8);
	const hours = num2(s, 11);
	const minutes = num2(s, 14);
	const seconds = num2(s, 17);
	if (
		year < 100 ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59 ||
		seconds < 0 ||
		seconds > 59
	) {
		return false;
	}
	let milliseconds = 0;
	if (len === 24) {
		if (s.charCodeAt(19) !== 46) {
			return false;
		}
		const msHi = num2(s, 20);
		const msLo = s.charCodeAt(22) - 48;
		if (msHi < 0 || msLo < 0 || msLo > 9) {
			return false;
		}
		milliseconds = msHi * 10 + msLo;
	}
	kk.date = utc
		? new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds))
		: localFromFields(year, month - 1, day, hours, minutes, seconds, milliseconds);
	return true;
}

/**
 * Claims a full-year "YYYY(sep)MM(sep)DD HH:mm[:ss]" input from fixed charCode offsets.
 * Only called after the template's validator accepted the string, so fields are digits and
 * hours are 00-29; hours 24-29 spill into the next day (legacy overflow result).
 */
function claimYmdDateTime(kk, s, template, withSeconds) {
	const hours = cc2(s, 11);
	const day = cc2(s, 8);
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = localFromFields(cc4(s, 0), cc2(s, 5) - 1, day + extraDay, hours - extraDay * 24, cc2(s, 14), withSeconds ? cc2(s, 17) : 0, 0);
	kk.detected_format = format_types[template];
	return true;
}

/** Mirror of claimYmdDateTime for "DD(sep)MM(sep)YYYY HH:mm[:ss]" layouts. */
function claimDmyDateTime(kk, s, template, withSeconds) {
	const hours = cc2(s, 11);
	const day = cc2(s, 0);
	const extraDay = hours >= 24 ? 1 : 0;
	kk.date = localFromFields(cc4(s, 6), cc2(s, 3) - 1, day + extraDay, hours - extraDay * 24, cc2(s, 14), withSeconds ? cc2(s, 17) : 0, 0);
	kk.detected_format = format_types[template];
	return true;
}

/**
 * Legacy construction for the rare 2-digit-year datetime shapes ("15-01-24 14:30", ...).
 * The exact split()-based pipeline is preserved — including the string round-trips — because
 * V8's string parser defines their (locked, often Invalid) results.
 */
function claimShortYearDateTime(kk, s, template, sep, dayFirst, withSeconds) {
	const [datePart, timePart] = s.split(' ');
	const dateParts = datePart.split(sep);
	const year = dayFirst ? dateParts[2] : dateParts[0];
	const month = dateParts[1];
	const day = dayFirst ? dateParts[0] : dateParts[2];
	const timeParts = timePart.split(':').map(Number);
	const hours = timeParts[0];
	if (hours >= 24) {
		const extraDays = Math.floor(hours / 24);
		const dateObj = fastLocalDate(year, month, day);
		dateObj.setDate(dateObj.getDate() + extraDays);
		const newDay = String(dateObj.getDate()).padStart(2, '0');
		const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
		const newYear = dateObj.getFullYear();
		const hoursText = (hours % 24).toString().padStart(2, '0');
		const minutesText = timeParts[1].toString().padStart(2, '0');
		kk.date = withSeconds
			? nativeLocalDate(`${newYear}-${newMonth}-${newDay}T${hoursText}:${minutesText}:${timeParts[2].toString().padStart(2, '0')}`)
			: nativeLocalDate(`${newYear}-${newMonth}-${newDay}T${hoursText}:${minutesText}`);
	} else {
		kk.date = fastLocalDateTime(year, month, day, timePart);
	}
	kk.detected_format = format_types[template];
	return true;
}

/**
 * Numeric date shapes ("-" / "." separated and compact digits), dispatched by length and
 * separator position. Branch order inside each length class preserves the legacy ladder's
 * claim precedence for overlapping shapes (dot DD.MM.YY before dot YY.MM.DD, dash YY-MM-DD
 * before dash DD-MM-YY, ...).
 *
 * @param {KkDate} kk
 * @param {string} s
 * @param {number} len
 * @param {number} probe2 - charCodeAt(2)
 * @param {number} probe4 - charCodeAt(4)
 * @returns {boolean}
 */
function parseNumericDate(kk, s, len, probe2, probe4) {
	switch (len) {
		case 19: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY HH:mm:ss'])) {
				return claimDmyDateTime(kk, s, 'DD.MM.YYYY HH:mm:ss', true);
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM-DD HH:mm:ss'])) {
				return claimYmdDateTime(kk, s, 'YYYY-MM-DD HH:mm:ss', true);
			}
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD HH:mm:ss'])) {
				return claimYmdDateTime(kk, s, 'YYYY.MM.DD HH:mm:ss', true);
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY HH:mm:ss'])) {
				return claimDmyDateTime(kk, s, 'DD-MM-YYYY HH:mm:ss', true);
			}
			return false;
		}
		case 16: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY HH:mm'])) {
				return claimDmyDateTime(kk, s, 'DD.MM.YYYY HH:mm', false);
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM-DD HH:mm'])) {
				return claimYmdDateTime(kk, s, 'YYYY-MM-DD HH:mm', false);
			}
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD HH:mm'])) {
				return claimYmdDateTime(kk, s, 'YYYY.MM.DD HH:mm', false);
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY HH:mm'])) {
				return claimDmyDateTime(kk, s, 'DD-MM-YYYY HH:mm', false);
			}
			return false;
		}
		case 10: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY'])) {
				kk.date = localFromFields(cc4(s, 6), cc2(s, 3) - 1, cc2(s, 0), 0, 0, 0, 0);
				kk.detected_format = format_types['DD.MM.YYYY'];
				return true;
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY'])) {
				kk.date = localFromFields(cc4(s, 6), cc2(s, 3) - 1, cc2(s, 0), 0, 0, 0, 0);
				kk.detected_format = format_types['DD-MM-YYYY'];
				return true;
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-DD-MM'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 8) - 1, cc2(s, 5), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY-DD-MM'];
				return true;
			}
			// New rung: date-only "YYYY.MM.DD" previously fell through to the native parser with
			// the same resulting instant; out-of-range shapes still do (e.g. "2300.01.15").
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 5) - 1, cc2(s, 8), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY.MM.DD'];
				return true;
			}
			return false;
		}
		case 13: {
			// "YYYY-MM-DD HH" / "YYYY.MM.DD HH" / "DD-MM-YYYY HH" (hours 00-23, 4-digit years); no
			// auto-detection claimed these before, so they used to throw.
			if (s.charCodeAt(10) !== 32) {
				return false;
			}
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM-DD HH'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 5) - 1, cc2(s, 8), cc2(s, 11), 0, 0, 0);
				kk.detected_format = format_types['YYYY-MM-DD HH'];
				return true;
			}
			if (probe4 === 46 && isValid(s, format_types['YYYY.MM.DD HH'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 5) - 1, cc2(s, 8), cc2(s, 11), 0, 0, 0);
				kk.detected_format = format_types['YYYY.MM.DD HH'];
				return true;
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY HH'])) {
				kk.date = localFromFields(cc4(s, 6), cc2(s, 3) - 1, cc2(s, 0), cc2(s, 11), 0, 0, 0);
				kk.detected_format = format_types['DD-MM-YYYY HH'];
				return true;
			}
			return false;
		}
		case 7: {
			if (probe4 === 45 && isValid(s, format_types['YYYY-MM'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 5) - 1, 1, 0, 0, 0, 0);
				kk.detected_format = format_types['YYYY-MM'];
				return true;
			}
			return false;
		}
		case 17: {
			// 2-digit-year datetime shapes share separator positions; ladder order decides.
			if (probe2 === 46) {
				if (isValid(s, format_types['DD.MM.YYYY HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'DD.MM.YYYY HH:mm:ss', '.', true, true);
				}
				if (isValid(s, format_types['YYYY.MM.DD HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'YYYY.MM.DD HH:mm:ss', '.', false, true);
				}
			} else if (probe2 === 45) {
				if (isValid(s, format_types['YYYY-MM-DD HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'YYYY-MM-DD HH:mm:ss', '-', false, true);
				}
				if (isValid(s, format_types['DD-MM-YYYY HH:mm:ss'])) {
					return claimShortYearDateTime(kk, s, 'DD-MM-YYYY HH:mm:ss', '-', true, true);
				}
			}
			return false;
		}
		case 14: {
			if (probe2 === 46) {
				if (isValid(s, format_types['DD.MM.YYYY HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'DD.MM.YYYY HH:mm', '.', true, false);
				}
				if (isValid(s, format_types['YYYY.MM.DD HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'YYYY.MM.DD HH:mm', '.', false, false);
				}
				return false;
			}
			if (probe2 === 45) {
				if (isValid(s, format_types['YYYY-MM-DD HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'YYYY-MM-DD HH:mm', '-', false, false);
				}
				if (isValid(s, format_types['DD-MM-YYYY HH:mm'])) {
					return claimShortYearDateTime(kk, s, 'DD-MM-YYYY HH:mm', '-', true, false);
				}
				return false;
			}
			if (isValid(s, format_types['YYYYMMDDHHmmss'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 4) - 1, cc2(s, 6), cc2(s, 8), cc2(s, 10), cc2(s, 12), 0);
				kk.detected_format = format_types['YYYYMMDDHHmmss'];
				return true;
			}
			return false;
		}
		case 12: {
			if (isValid(s, format_types['YYYYMMDDHHmmss'])) {
				// Legacy body verbatim: fixed substrings produce a truncated string for
				// 12-char inputs, whose (Invalid) native-parse result is locked.
				const year = s.substring(0, 4);
				const month = s.substring(4, 6);
				const day = s.substring(6, 8);
				const hour = s.substring(8, 10);
				const minute = s.substring(10, 12);
				const second = s.substring(12, 14);
				kk.date = nativeLocalDate(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
				kk.detected_format = format_types['YYYYMMDDHHmmss'];
				return true;
			}
			return false;
		}
		case 8: {
			if (probe2 === 46 && isValid(s, format_types['DD.MM.YYYY'])) {
				const [day, month, year] = s.split('.');
				kk.date = fastLocalDate(year, month, day);
				kk.detected_format = format_types['DD.MM.YYYY'];
				return true;
			}
			if (probe2 === 45 && isValid(s, format_types['DD-MM-YYYY'])) {
				const [day, month, year] = s.split('-');
				kk.date = fastLocalDate(year, month, day);
				kk.detected_format = format_types['DD-MM-YYYY'];
				return true;
			}
			if (probe2 !== 46 && probe2 !== 45 && isValid(s, format_types['YYYYMMDD'])) {
				kk.date = localFromFields(cc4(s, 0), cc2(s, 4) - 1, cc2(s, 6), 0, 0, 0, 0);
				kk.detected_format = format_types['YYYYMMDD'];
				return true;
			}
			return false;
		}
		case 6: {
			if (isValid(s, format_types['YYYYMMDD'])) {
				// Legacy body verbatim for the short compact form (locked Invalid result).
				const year = String(s.substring(0, 4), 10);
				const month = String(s.substring(4, 6), 10);
				const day = String(s.substring(6, 8), 10);
				kk.date = nativeLocalDate(`${year}-${month}-${day} 00:00:00`);
				kk.detected_format = format_types['YYYYMMDD'];
				return true;
			}
			return false;
		}
		default:
			return false;
	}
}

/**
 * Legacy text-format regex chain — the cold fallback for every string the fast paths decline
 * (2-digit-year text forms, tab-separated ordinals, embedded 'Do' matches, unknown month
 * names, ...), ending in the native `new Date(string)` parser. Bodies are the original rung
 * bodies, verbatim: their string round-trip construction defines the locked results.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @param {boolean} has_space
 * @returns {boolean} always true (kk.date is always assigned, possibly an Invalid Date)
 */
function parseTextLegacy(kk, date, has_space) {
	claimLegacyText(kk, date, has_space);
	if (kk.detected_format === format_types['dddd, DD MMMM YYYY'] && Number.isNaN(kk.date.getTime()) && ZERO_PADDED_DAY_AFTER_WEEKDAY.test(date)) {
		// Before this pattern accepted a zero-padded day, such text went to the engine's parser, which
		// reads an English month from the first three letters of a word ("Saturday, 06 Mayis 2022"):
		// kept as it was. Other month words kk-date does not know stay invalid.
		kk.detected_format = null;
		parseNative(kk, date);
	}
	return true;
}

// "Saturday, 06 …": a weekday name, a comma and a zero-padded day (see parseTextLegacy)
const ZERO_PADDED_DAY_AFTER_WEEKDAY = /^[\p{L}\p{M}]+, 0\d /u;

/**
 * The legacy rungs of parseTextLegacy (bodies verbatim); the last one hands the text to
 * parseNative.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @param {boolean} has_space
 */
function claimLegacyText(kk, date, has_space) {
	if (has_space && isValid(date, format_types['DD MMMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[2];
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['DD MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM dddd'])) {
		const currentYear = parseToday().year;
		const parts = date.split(' '); // e.g., ['01', 'January', 'Monday']
		const day = parts[0];
		const month = isValidMonth(parts[1]);
		kk.date = nativeLocalDate(`${currentYear}-${month}-${day} 00:00:00`);
		kk.detected_format = format_types['DD MMMM dddd'];
	} else if (has_space && isValid(date, format_types['D MMMM YYYY'])) {
		const parts = date.split(' '); // e.g., ['1', 'January', '2024'] or ['01', 'January', '2024']
		const day = parts[0];
		const year = parts[2];
		const month = isValidMonth(parts[1]);
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['D MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['YYYY MMM DD'])) {
		const parts = date.split(' ');
		const year = parts[0];
		const month = isValidMonth(parts[1]);
		const day = parts[2];
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['YYYY MMM DD'];
	} else if (isValid(date, format_types['Do MMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[2];
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['Do MMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM dddd, YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[0], 10).toString();
		const month = isValidMonth(parts[1]);
		const year = parts[3];
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['DD MMMM dddd, YYYY'];
	} else if (has_space && isValid(date, format_types['dddd, DD MMMM YYYY'])) {
		const parts = date.split(' ');
		const day = parseInt(parts[1], 10).toString();
		const month = isValidMonth(parts[2]);
		const year = parts[3];
		kk.date = nativeLocalDate(`${year}-${month}-${day.padStart(2, '0')} 00:00:00`); // Ensure day is padded for Date constructor
		kk.detected_format = format_types['dddd, DD MMMM YYYY'];
	} else if (has_space && isValid(date, format_types['DD MMMM'])) {
		const currentYear = parseToday().year;
		const parts = date.split(' ');
		const day = parts[0];
		const month = isValidMonth(parts[1]);
		kk.date = nativeLocalDate(`${currentYear}-${month}-${day.padStart(2, '0')} 00:00:00`);
		kk.detected_format = format_types['DD MMMM'];
	} else {
		parseNative(kk, date);
	}
}

// A leading English ordinal day ("15th May…", "Monday, 15th May…"): the native parser rejects the
// suffix but parses the rest. Only a leading position (optionally after a weekday name) is
// rewritten, so junk such as "foo 1st Jan 2024" keeps failing instead of being half-parsed.
const LEADING_ORDINAL_DAY_REGEX = /^(?:([\p{L}]+),?\s+)?(\d{1,2})(?:st|nd|rd|th)\b/iu;
// ISO-8601 date prefix: an explicit-zone string starting with it is an ISO 8601 instant.
const ISO_DATE_PREFIX_REGEX = /^\d{4}-\d{2}-\d{2}/;

// A text date followed by a 24-hour time ("Pazartesi, 15 Ocak 2024 14:30"): the engine's parser
// knows only English month names (and gives a year-less date the year 2001); kk-date's text
// templates know ~90 languages but no time. The suffix pattern is matched in linear time, on
// inputs of bounded length.
const TEXT_TIME_SUFFIX_REGEX = /\s([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const MAX_TEXT_DATE_TIME_LENGTH = 128;
const TEXT_HAS_LETTER_REGEX = /\p{L}/u;
// detected_format values of a date-only text parse that may take a trailing time
const TEXT_DATE_FORMATS = new Set([
	'DD MMMM YYYY',
	'D MMMM YYYY',
	'Do MMM YYYY',
	'Do MMMM YYYY',
	'DD MMMM YYYY dddd',
	'dddd, DD MMMM YYYY',
	'DD MMMM dddd YYYY',
	'DD MMMM dddd, YYYY',
	'DD MMM YYYY',
	'YYYY MMM DD',
	'YYYY MMMM DD',
	'DD MMMM',
	'DD MMM',
	'DD MMMM dddd',
]);

/**
 * Native-parser fallback for shapes no template claims. A text date kk-date reads followed by a
 * time is parsed by kk-date (parseTextDateTime); otherwise the engine parses the string, retried
 * once with an English ordinal day suffix removed ("15th May 2024 08:00" -> "15 May 2024 08:00"). The zone is read
 * the way the engine reads it (nativeZoneKind): strings with their own offset / zone (RFC 2822,
 * HTTP dates, Date#toString, ISO with an offset) are absolute instants the global timezone never
 * reinterprets; ES5 date-only forms ("2024", "+002024-01-15"), which the engine reads as UTC
 * midnight, are dates like every other date-only input; everything else is a naive wall clock.
 *
 * @param {KkDate} kk
 * @param {string} date
 */
function parseNative(kk, date) {
	if (parseTextDateTime(kk, date)) {
		return;
	}
	let source = date;
	let parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) {
		const ordinal = LEADING_ORDINAL_DAY_REGEX.exec(date);
		if (ordinal !== null && (ordinal[1] === undefined || isValidDayName(ordinal[1]))) {
			const prefix = date.slice(0, ordinal.index + ordinal[0].length - ordinal[2].length - 2);
			source = `${prefix}${ordinal[2]}${date.slice(ordinal.index + ordinal[0].length)}`;
			parsed = new Date(source);
		}
	}
	if (Number.isNaN(parsed.getTime())) {
		kk.date = parsed;
		return;
	}
	const zone = nativeZoneKind(source);
	if (zone === ZONE_EXPLICIT) {
		kk.date = parsed;
		kk.detected_format = ISO_DATE_PREFIX_REGEX.test(date) ? 'ISO8601' : 'RFC2822';
	} else if (zone === ZONE_UTC_DATE) {
		kk.date = localFromFields(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0);
	} else {
		kk.date = parsed;
		recordNativeWall(source);
	}
}

/**
 * "<text date> HH:mm[:ss]" where the date is one of kk-date's text templates (any supported
 * language): the date fields of that parse plus the time.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @returns {boolean} false when the input is not of that shape
 */
function parseTextDateTime(kk, date) {
	// a text date names its month (letters)
	if (date.length > MAX_TEXT_DATE_TIME_LENGTH || !TEXT_HAS_LETTER_REGEX.test(date)) {
		return false;
	}
	const match = TEXT_TIME_SUFFIX_REGEX.exec(date);
	if (match === null) {
		return false;
	}
	const text = date.slice(0, match.index).trimEnd();
	// one time only: a date part ending with a time of its own is no text date
	if (TEXT_TIME_SUFFIX_REGEX.test(text)) {
		return false;
	}
	const day = { date: null, detected_format: null, temp_config: EMPTY_TEMP_CONFIG };
	try {
		parseStringInput(day, text);
	} catch {
		return false;
	}
	if (!TEXT_DATE_FORMATS.has(day.detected_format) || Number.isNaN(day.date.getTime())) {
		return false;
	}
	kk.date = localFromFields(
		day.date.getFullYear(),
		day.date.getMonth(),
		day.date.getDate(),
		+match[1],
		+match[2],
		match[3] === undefined ? 0 : +match[3],
		0,
	);
	kk.detected_format = null;
	return true;
}

/**
 * Auto-detects and parses a string input, assigning kk.date and kk.detected_format.
 *
 * @param {KkDate} kk
 * @param {string} date
 * @returns {boolean} the constructor's is_can_cache flag (auto-detected YYYY-MM-DD is not
 * cached; every other claim — including the native fallback — is; legacy behavior)
 */
function parseStringInput(kk, date) {
	const len = date.length;
	const probe2 = date.charCodeAt(2);
	const probe4 = date.charCodeAt(4);
	// Hottest shape first; also claims the lenient 2-digit-year "YY-MM-DD" (legacy precedence).
	if ((probe2 === 45 || probe4 === 45) && isValid(date, format_types['YYYY-MM-DD'])) {
		if (len === 10) {
			kk.date = localFromFields(cc4(date, 0), cc2(date, 5) - 1, cc2(date, 8), 0, 0, 0, 0);
		} else {
			const [year, month, day] = date.split('-');
			kk.date = fastLocalDate(year, month, day);
		}
		kk.detected_format = 'YYYY-MM-DD';
		return false;
	}
	if (probe2 === 58 && len <= 15 && parseTimeOnly(kk, date, len)) {
		return true;
	}
	if (date.charCodeAt(len - 1) === 90 && date.indexOf('T') !== -1) {
		// UTC ISO strings; the exact 20/24-char shapes skip the native string parser.
		if (!((len === 20 || len === 24) && parseIsoExact(kk, date, len, true))) {
			kk.date = new Date(date);
		}
		kk.detected_format = 'ISO8601';
		return true;
	}
	if (probe4 === 45 && date.charCodeAt(7) === 45 && date.charCodeAt(10) === 84) {
		// ISO datetime without a Z suffix, matched precisely by shape "____-__-__T…" (dashes at
		// index 4 & 7, 'T' at 10) so weekday-name inputs like "Tuesday, …" are not caught.
		if (!(len === 19 && parseIsoExact(kk, date, len, false))) {
			kk.date = new Date(date);
			if (hasExplicitZone(date)) {
				// "…+03:00" / "…-0500": an absolute instant, never reinterpreted.
				kk.detected_format = 'ISO8601';
			} else {
				// Local ISO datetime (e.g. with milliseconds): the same fields read as UTC are its
				// wall clock, for the global-timezone reinterpretation.
				recordNativeWall(date);
			}
		}
		// Otherwise detected_format stays null (legacy) and the instant is naive local time.
		return true;
	}
	if (parseNumericDate(kk, date, len, probe2, probe4)) {
		return true;
	}
	const has_space = date.indexOf(' ') !== -1;
	if (has_space && tryParseTextDate(kk, date)) {
		return true;
	}
	return parseTextLegacy(kk, date, has_space);
}

// Parses that are never cached: bare times are cheaper to parse than a date-checked cache lookup,
// and a bare weekday name also depends on the global weekStartDay.
const UNCACHED_FORMATS = new Set([
	'HH:mm',
	'HH:mm:ss',
	'HH:mm:ss.SSS',
	'hh:mm',
	'hh:mm:ss',
	'hh:mm:ss.SSS',
	'mm:ss',
	'HH',
	'mm',
	'ss',
	'ddd',
	'dddd',
]);

// Forced templates whose weekday word is validated (see parseForcedTemplate).
const WEEKDAY_CHECKED_TEMPLATES = new Set(['ddd', 'dddd', 'DD MMMM YYYY dddd', 'DD MMMM dddd YYYY']);

/**
 * Whether a cached entry is a parse of this input that still holds. Keys are the raw text, so a
 * text can equal another input's key (a forced template's `${template}\u0001${text}`, a format
 * memo key): the entry must come from the same kind of parse (`p`: the forced template, or null).
 * A parse that depended on today's date or on the global locale's language (month/weekday names)
 * is only reused on the same date and under the same language.
 *
 * @param {{p: string|null, d: number, l: string|null}} cached
 * @param {string|null} template - the forced template of this construction (null: auto-detected)
 * @returns {boolean}
 */
function isCachedParseCurrent(cached, template) {
	if (cached.p !== template || (cached.l !== null && cached.l !== configuredLanguage())) {
		return false;
	}
	if (Number.isNaN(cached.d)) {
		return true;
	}
	return cached.d === ensureToday().stamp;
}

/**
 * Whether a string input may use the constructor's parse cache. Bare times and weekday names are
 * never cached (see UNCACHED_FORMATS), and auto-detected "YYYY-MM-DD" never was (parsing it is
 * cheaper than a lookup; "YYYY-DD-MM" with a day above 12 is not); skipping their lookup also
 * keeps the cache's miss statistics meaningful.
 *
 * @param {string} date
 * @param {string|null} template
 * @returns {boolean}
 */
function isCacheableInput(date, template) {
	if (template !== null) {
		return !UNCACHED_FORMATS.has(template);
	}
	if (date.charCodeAt(2) === 58) {
		return false;
	}
	return !(date.length === 10 && date.charCodeAt(4) === 45 && date.charCodeAt(7) === 45 && cc2(date, 5) <= 12);
}

/**
 * Numeric inputs: Unix timestamps. Up to 10 digits (sign included, legacy rule) are seconds,
 * longer values milliseconds. Fractional values follow the same rule on their integer part
 * (1700000000.5 is 1700000000500 ms) instead of being string-parsed.
 *
 * @param {KkDate} kk
 * @param {number} date - a finite number
 */
function parseTimestampNumber(kk, date) {
	if (Number.isInteger(date)) {
		// Unix timestamp (seconds) or JavaScript timestamp (milliseconds) - always UTC
		kk.date = new Date(`${date}`.length <= 10 ? date * 1000 : date);
	} else {
		kk.date = new Date(`${Math.trunc(date)}`.length <= 10 ? Math.round(date * 1000) : date);
	}
	kk.detected_format = 'Xx';
}

/**
 * Constructor forced-format parsing: the input must match the template (its legacy regex — the
 * default-mode isValid semantics), and the template's fields then define the date. Missing fields
 * follow moment: no date field at all -> today; otherwise a missing year/month defaults to the
 * current one (month: only when a day is given, else January) and a missing day to the 1st;
 * missing time fields are 0. "Today" is the global timezone's date. A 2-digit year in a YYYY field
 * reads like moment (00-68 -> 2000-2068, 69-99 -> 1969-1999). Hours 24-29 and day overflow roll
 * over like the auto-detected inputs. Weekday names are not cross-checked against the date.
 *
 * @param {KkDate} kk
 * @param {*} date - constructor input
 * @param {string} template
 */
function parseForcedTemplate(kk, date, template) {
	const regex = format_types_regex[template];
	const input = typeof date === 'string' ? date : `${date}`;
	if (template === TEMPLATE_DDDD) {
		// A bare weekday name identifies no date: it resolves to today, like moment('Monday', 'dddd').
		if (!isValidDayName(input)) {
			throw new Error(`Invalid format ! ${template} !`);
		}
	} else {
		if (regex === undefined) {
			throw new Error(`Unsupported Format! ${template} !`);
		}
		if (!regex.test(input)) {
			throw new Error(`Invalid format ! ${format_types[template]} !`);
		}
		// Hot shapes keep their charCode fast paths.
		if (input.length === 10 && template === 'YYYY-MM-DD') {
			kk.date = localFromFields(cc4(input, 0), cc2(input, 5) - 1, cc2(input, 8), 0, 0, 0, 0);
			kk.detected_format = 'YYYY-MM-DD';
			return;
		}
		if (template === 'YYYY-DD-MM') {
			kk.date = localFromFields(cc4(input, 0), cc2(input, 8) - 1, cc2(input, 5), 0, 0, 0, 0);
			kk.detected_format = 'YYYY-DD-MM';
			return;
		}
	}
	const fields = parseTemplateFields(template, input);
	if (fields === null) {
		throw new Error('Invalid Date');
	}
	if (fields.yearDigits === 2) {
		fields.year += fields.year > 68 ? 1900 : 2000;
	}
	// Templates no parser ever accepted before must carry a real weekday name (junk words keep
	// failing); the legacy text templates keep their unchecked weekday word.
	if (fields.weekday !== null && WEEKDAY_CHECKED_TEMPLATES.has(template) && !isValidDayName(fields.weekday)) {
		throw new Error(`Invalid format ! ${format_types[template]} !`);
	}
	let year = fields.year;
	let month = fields.month;
	let day = fields.day;
	if (fields.monthName !== null) {
		month = getMonthNumber(fields.monthName);
		if (month === 0) {
			throw new Error('Invalid Date');
		}
	}
	if (year === -1 || month === -1 || day === -1) {
		const today = parseToday();
		if (year === -1 && month === -1 && day === -1) {
			year = today.year;
			month = today.month + 1;
			day = today.day;
			if (fields.weekday !== null) {
				// A bare weekday name is that day of the current week (moment), the week starting on
				// the global weekStartDay.
				const target = getWeekdayIndex(fields.weekday);
				const weekStart = global_config.weekStartDay;
				day += ((target - weekStart + 7) % 7) - ((getDayOfWeek(year, month, day) - weekStart + 7) % 7);
			}
		} else {
			if (year === -1) {
				year = today.year;
			}
			if (month === -1) {
				month = day !== -1 ? today.month + 1 : 1;
			}
			if (day === -1) {
				day = 1;
			}
		}
	}
	let hour = fields.hour !== -1 ? fields.hour : 0;
	if (fields.hour12 !== -1) {
		hour = (fields.hour12 % 12) + (fields.meridiem === 'PM' ? 12 : 0);
	}
	kk.date = localFromFields(
		year,
		month - 1,
		day,
		hour,
		fields.minute !== -1 ? fields.minute : 0,
		fields.second !== -1 ? fields.second : 0,
		fields.ms !== -1 ? fields.ms : 0,
	);
	kk.detected_format = format_types[template];
}

class KkDate {
	/**
	 * Constructs a KkDate instance with the given input and format.
	 *
	 * @param {string|Date|KkDate|number} date - The input value. Can be:
	 *  - a date string (e.g. "2024-01-15", "15.01.2024"),
	 *  - a native Date object,
	 *  - another KkDate instance,
	 *  - a numeric Unix timestamp (≤10 digits treated as seconds, >10 digits as milliseconds).
	 *
	 * @param {string} [date_format] - Optional format hint for parsing the date string.
	 * Supported formats include: `"YYYY-MM-DD"`, `"DD.MM.YYYY"`, `"YYYY-MM-DD HH:mm:ss"`, etc.
	 */
	constructor(...params) {
		let is_can_cache = true;
		let cached = null;
		let cache_key = null;
		let wall = Number.NaN;
		this.detected_format = null;
		this.temp_config = EMPTY_TEMP_CONFIG;
		// Formatter config-signature cache slot (-1 = not computed yet); see formatSig().
		this._fmt_sig = -1;
		this._fmt_sig_v = -1;
		// Start the parse capture afresh (also discards what a construction that threw left behind).
		resetParseCapture();
		if (params.length === 0) {
			this.date = new Date();
			this.detected_format = 'now';
		} else {
			const date = params[0];
			const template = typeof params[1] === 'string' ? params[1] : null;
			if (cachingEnabled && typeof date === 'string' && isCacheableInput(date, template)) {
				// The forced template is part of the key: the same text is a different instant under a
				// different template ('2024-05-03' is May 3 auto-detected but March 5 as YYYY-DD-MM).
				cache_key = template === null ? date : `${template}\u0001${date}`;
				cached = nopeRedis.getItem(cache_key);
				if (cached && !isCachedParseCurrent(cached, template)) {
					cached = null;
				}
			}
			if (cached) {
				// Restore detected_format and the wall clock alongside the instant: they drive timezone
				// reinterpretation and UTC formatting, so a hit must behave like the parse it cached.
				this.date = new Date(cached.t);
				this.detected_format = cached.f;
				wall = cached.w;
			} else {
				if (cache_key !== null) {
					captureWallForParse();
				}
				if (template !== null) {
					parseForcedTemplate(this, date, template);
				} else if (typeof date === 'string') {
					is_can_cache = parseStringInput(this, date);
				} else if (typeof date === 'number' && Number.isFinite(date)) {
					parseTimestampNumber(this, date);
				} else if (date instanceof KkDate) {
					// Clone from another KkDate - preserve the exact time
					this.date = new Date(date.date.getTime());
					this.detected_format = 'kkDate';
				} else if (date instanceof Date) {
					// Clone from Date object - preserve the exact time
					this.date = new Date(date.getTime());
					this.detected_format = 'now';
				} else {
					// Exotic inputs (null, NaN, plain objects): parse their string coercion — the legacy
					// ladder validated the same coercion, and non-parseable values end at the throw below.
					is_can_cache = parseStringInput(this, `${date}`);
				}
				// Inline isInvalid(): this.date is always a Date here, so the helper's
				// try/catch adds nothing. The thrown error must stay byte-identical.
				if (!this.date || Number.isNaN(this.date.getTime())) {
					throw new Error('Invalid Date');
				}
				wall = takeParsedWall();
				if (cache_key !== null && is_can_cache && !UNCACHED_FORMATS.has(this.detected_format)) {
					// p: the forced template (null: auto-detected), d: the date a parse took as "today"
					// ('15 March', forced 'MM', ...; NaN if none), l: the language its month/weekday names
					// were resolved in (null if none).
					nopeRedis.setItemSync(cache_key, {
						t: this.date.getTime(),
						f: this.detected_format,
						w: wall,
						p: template,
						d: takeParsedToday(),
						l: takeLocaleNamesUsed() ? configuredLanguage() : null,
					});
				}
			}
		}
		// parseWithTimezone() can only change the date while the global timezone differs from
		// the system timezone (a fresh instance never has temp_config.timezone) — skip it otherwise.
		if (timezone_shift_enabled) {
			this.date = parseWithTimezone(this, wall);
		}
	}

	/**
	 * returns native Date getTime value
	 *
	 * @returns {number|Error}
	 */
	getTime() {
		isInvalid(this.date);
		return this.date.getTime();
	}

	/**
	 * Optimized helper to get timestamp from various input types
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {number}
	 */
	_getTimestamp(date) {
		if (isKkDate(date) || date instanceof Date) {
			return date.getTime();
		}
		if (Number.isInteger(date)) {
			// Same seconds-vs-milliseconds rule as the constructor: up to 10 digits = Unix seconds
			return `${date}`.length <= 10 ? date * 1000 : date;
		}
		// Only create KkDate instance for string inputs
		return new KkDate(date).getTime();
	}

	/**
	 * isBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isBefore(date) {
		return this.getTime() < this._getTimestamp(date);
	}

	/**
	 * isSameOrBefore
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrBefore(date) {
		return this.getTime() <= this._getTimestamp(date);
	}

	/**
	 * isAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isAfter(date) {
		return this.getTime() > this._getTimestamp(date);
	}

	/**
	 * isSameOrAfter
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSameOrAfter(date) {
		return this.getTime() >= this._getTimestamp(date);
	}

	/**
	 * isSame
	 *
	 * @param {string|Date|KkDate} date - date/datetime/time
	 * @returns {boolean|Error}
	 */
	isSame(date) {
		return this.getTime() === this._getTimestamp(date);
	}

	/**
	 * isBetween
	 *
	 * @param {string|Date|KkDate} start - start date/datetime/time
	 * @param {string|Date|KkDate} end - end date/datetime/time
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} [unit='milliseconds']
	 * @returns {boolean|Error}
	 */
	isBetween(start, end, unit = 'milliseconds') {
		isInvalid(this.date);
		const starts = isKkDate(start) ? start.getTime() : new KkDate(start).getTime();
		const ends = isKkDate(end) ? end.getTime() : new KkDate(end).getTime();
		const date_time = this.date.getTime();

		if (unit === 'milliseconds') {
			return date_time >= starts && date_time <= ends;
		}

		if (!timeInMilliseconds[unit]) {
			throw new Error('Invalid unit type. Must be one of: milliseconds, seconds, minutes, hours, days, weeks, months, years');
		}

		// Calendar periods in this instance's timezone (moment's isBetween with a unit and '[]'): the
		// period containing this date must lie between the periods containing start and end.
		const timezone = effectiveTimezone(this);
		const weekStartDay = effectiveWeekStartDay(this);
		const period = startOfPeriod(date_time, unit, timezone, weekStartDay);
		return period >= startOfPeriod(starts, unit, timezone, weekStartDay) && period <= startOfPeriod(ends, unit, timezone, weekStartDay);
	}

	/**
	 * returns string of date
	 *
	 * @returns {string|Error}
	 */
	toString() {
		isInvalid(this.date);
		return this.date.toString();
	}

	/**
	 * The toDateString() method of Date instances returns a string representing the date portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toDateString
	 * @returns {string|Error}
	 */
	toDateString() {
		isInvalid(this.date);
		return this.date.toDateString();
	}

	/**
	 * The toISOString() method of Date instances returns a string representing this date in the date time string format, a simplified format based on ISO 8601, which is always 24 or 27 characters long (YYYY-MM-DDTHH:mm:ss.sssZ or ±YYYYYY-MM-DDTHH:mm:ss.sssZ, respectively). The timezone is always UTC, as denoted by the suffix Z.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
	 *
	 * @returns {string|Error}
	 */
	toISOString() {
		isInvalid(this.date);
		return this.date.toISOString();
	}

	/**
	 * The toJSON() method of Date instances returns a string representing this date in the same ISO format as toISOString().
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON
	 *
	 * @returns {Object|Error}
	 */
	toJSON() {
		isInvalid(this.date);
		return this.date.toJSON();
	}

	/**
	 * The toUTCString() method of Date instances returns a string representing this date in the RFC 7231 format, with negative years allowed. The timezone is always UTC. toGMTString() is an alias of this method.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toUTCString
	 *
	 * @returns {string|Error}
	 */
	toUTCString() {
		isInvalid(this.date);
		return this.date.toUTCString();
	}

	/**
	 * The locale and options parameters customize the behavior of the function and let applications specify the language whose formatting conventions should be used.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleDateString(options) {
		isInvalid(this.date);
		return this.date.toLocaleDateString(displayLocale(this), displayOptions(this, options));
	}

	/**
	 * The toLocaleString() method of Date instances returns a string with a language-sensitive representation of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleString(options) {
		isInvalid(this.date);
		return this.date.toLocaleString(displayLocale(this), displayOptions(this, options));
	}

	/**
	 * The toLocaleTimeString() method of Date instances returns a string with a language-sensitive representation of the time portion of this date in the local timezone. In implementations with Intl.DateTimeFormat API support, this method simply calls Intl.DateTimeFormat.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
	 *
	 * @param {object} options
	 * @returns {string|Error}
	 */
	toLocaleTimeString(options) {
		isInvalid(this.date);
		return this.date.toLocaleTimeString(displayLocale(this), displayOptions(this, options));
	}

	/**
	 * The toTimeString() method of Date instances returns a string representing the time portion of this date interpreted in the local timezone.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toTimeString
	 *
	 * @returns {string|Error}
	 */
	toTimeString() {
		isInvalid(this.date);
		return this.date.toTimeString();
	}

	/**
	 * The valueOf() method of Date instances returns the number of milliseconds for this date since the epoch, which is defined as the midnight at the beginning of January 1, 1970, UTC.
	 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/valueOf
	 *
	 * @returns {number|Error}
	 */
	valueOf() {
		isInvalid(this.date);
		return this.date.valueOf();
	}

	/**
	 * valueOfLocal() locale value of giving
	 *
	 * @param {boolean} [check_error=true]
	 * @returns {number}
	 */
	valueOfLocal(check_error = true) {
		if (check_error) {
			isInvalid(this.date);
		}
		// Legacy semantics, valueOf() + (system offset - global offset): the instant whose
		// global-timezone wall clock reads what the system clock reads at this instant. Both offsets
		// are resolved at this date (never at call time), so the result does not depend on when it
		// is called, and the global one at the target instant itself (DST-safe).
		const utc = this.date.getTime();
		const global_timezone = global_config.timezone;
		if (!global_timezone || global_timezone === systemTimezone || Number.isNaN(utc)) {
			return utc;
		}
		return wallClockToInstant(global_timezone, toWallClock(systemTimezone, utc));
	}

	/**
	 * This is a pretty robust function for adding and subtracting time to an existing moment. To add time, specify the key of the time unit you want to add and the amount you want to add. Similarly, to subtract time, use the same key to subtract the amount of time.
	 *
	 * @param {number} amount
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {KkDate}
	 */
	add(amount, type) {
		isInvalid(this.date);

		// Duration objects (kk_date.duration()) carry an exact length in milliseconds.
		if (typeof amount === 'object' && amount !== null && amount.$kk_date !== undefined) {
			const milliseconds = amount.$kk_date.milliseconds;
			if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds)) {
				throw new Error('amount is wrong');
			}
			this.date = new Date(this.date.getTime() + milliseconds);
			return this;
		}
		if (typeof amount !== 'number' || !Number.isFinite(amount)) {
			throw new Error('amount is wrong');
		}
		if (timeInMilliseconds[type] === undefined) {
			throw new Error('type is wrong');
		}
		if (amount === 0) {
			return this;
		}

		const elapsed = ELAPSED_UNIT_MS[type];
		if (elapsed !== undefined) {
			// Elapsed-time units are absolute durations, like moment: one hour is 3,600,000 ms even
			// across a DST transition, and fractional amounts are exact (1.5 hours = 90 minutes).
			this.date = new Date(this.date.getTime() + amount * elapsed);
			return this;
		}

		// Calendar units move the wall clock in this instance's timezone; like moment, fractional
		// amounts are rounded (weeks and years first become days and months).
		const timezone = effectiveTimezone(this);
		const days = type === 'days' || type === 'weeks' ? absRound(type === 'weeks' ? amount * 7 : amount) : 0;
		const months = days === 0 ? absRound(type === 'years' ? amount * 12 : amount) : 0;
		if (days === 0 && months === 0) {
			// a fraction that rounds to nothing (add(0.4, 'days')) leaves the date alone, like add(0)
			return this;
		}
		if (isSystemZone(timezone) && this.date.getFullYear() >= 100) {
			// System zone: one local-time setter resolves the new wall clock like wallClockToInstant
			// (gap -> forward) without offset lookups; keepOriginalSide() handles a DST overlap.
			const original = this.date;
			const time = original.getTime();
			const local = new Date(time);
			if (days !== 0) {
				local.setDate(original.getDate() + days);
				this.date = keepOriginalSide(local, original, days * DAY_MS);
				return this;
			}
			this.date = addMonthsLocal(original, months);
			return this;
		}
		const time = this.date.getTime();
		const offset = offsetAt(timezone, time);
		const wall = new Date(time + offset);
		if (days !== 0) {
			wall.setUTCDate(wall.getUTCDate() + days);
		} else {
			// months and years share the end-of-month clamp (Feb 29 + 1 year = Feb 28, Jan 31 + 1 month = Feb 29)
			addMonthsToWall(wall, months);
		}
		// a wall clock that occurs twice (DST overlap) keeps the side of the original instant
		this.date = new Date(wallClockToInstant(timezone, wall.getTime(), offset));
		return this;
	}

	/**
	 * Calculates the difference between this date (start) and the given end date.
	 * @param {string|Date|KkDate|number} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type
	 * @param {boolean} [is_decimal=false]
	 * @returns {number}
	 */
	diff(end, type, is_decimal = false) {
		const value = diffValue(this, end, type);
		return is_decimal ? value : absFloor(value);
	}

	/**
	 * Returns an array of formatted date strings between this date (start) and the given end date,
	 * stepping by the given unit.
	 * @param {string|Date|KkDate|number} end
	 * @param {'seconds'|'minutes'|'hours'|'days'|'weeks'|'months'|'years'} type
	 * @param {string} [template='YYYY-MM-DD']
	 * @returns {string[]}
	 */
	diff_range(end, type, template = format_types['YYYY-MM-DD']) {
		const endKk = isKkDate(end) ? end : new KkDate(end);
		if (type !== 'days' && type !== 'weeks' && type !== 'months' && type !== 'years') {
			// time units: this date + n units, up to the end instant
			const steps = absFloor(diffValue(this, endKk, type));
			const rangeDates = [formatter(this, template)];
			for (let index = 1; index <= steps; index++) {
				const step = new KkDate(this);
				step.temp_config = this.temp_config;
				step.add(index, type);
				rangeDates.push(formatter(step, template));
			}
			return rangeDates;
		}
		// Calendar units: the n-th entry is on this date + n units (month ends clamp like add(): Jan 31 ->
		// Feb 29 -> Mar 31) at this date's time of day, for every such date up to end's date in this
		// instance's timezone, so the time of day does not drop the last date (10:00 -> 09:00 two days
		// later lists three dates).
		const timezone = effectiveTimezone(this);
		const startWall = wallClockOf(timezone, this.date);
		const startDay = Math.floor(startWall / DAY_MS);
		const timeOfDay = startWall - startDay * DAY_MS;
		const lastDay = Math.floor(wallClockOf(timezone, endKk.date) / DAY_MS);
		const startDate = new Date(startWall);
		const year = startDate.getUTCFullYear();
		const month = startDate.getUTCMonth();
		const dayOfMonth = startDate.getUTCDate();
		// a fixed UTC offset never moves a wall clock to another date: no check needed
		const fixedOffset = isUtcZone(timezone);
		const system = isSystemZone(timezone);
		const rangeDates = [formatter(this, template)];
		for (let index = 1; ; index++) {
			let day;
			if (type === 'days') {
				day = startDay + index;
			} else if (type === 'weeks') {
				day = startDay + 7 * index;
			} else {
				const months = month + (type === 'months' ? index : 12 * index);
				const targetYear = year + Math.floor(months / 12);
				const targetMonth = months % 12;
				day = daysFromCivil(targetYear, targetMonth, Math.min(dayOfMonth, daysInMonth(targetYear, targetMonth)));
			}
			if (day > lastDay) {
				break;
			}
			const step = new KkDate(this);
			step.temp_config = this.temp_config;
			step.add(index, type);
			if (!fixedOffset) {
				const date = step.date;
				let moved;
				if (system) {
					// the local getters compute the fields the formatter reads next
					moved = daysFromCivil(date.getFullYear(), date.getMonth(), date.getDate()) !== day;
				} else {
					// add() resolved this wall clock with the offsets a day either side of it (cached): when
					// they agree no offset change is near, so the wall clock and its date were kept
					const wallMs = day * DAY_MS + timeOfDay;
					const probe = wallMs - (((wallMs % HOUR_MS) + HOUR_MS) % HOUR_MS);
					moved =
						offsetAt(timezone, probe - DAY_MS) !== offsetAt(timezone, probe + DAY_MS) &&
						Math.floor(toWallClock(timezone, date.getTime()) / DAY_MS) !== day;
				}
				if (moved) {
					// The time of day does not exist on that date and add() moved it forward by the DST gap
					// into the next date (America/Nuuk skips 23:00-24:00 on 2024-03-30): read it with the
					// offset after the gap instead, which moves it back by the gap and keeps the date.
					const time = date.getTime();
					const earlier = new Date(day * DAY_MS + timeOfDay - (wallClockOf(timezone, date) - time));
					if (Math.floor(wallClockOf(timezone, earlier) / DAY_MS) === day) {
						step.date = earlier;
					} else if (type === 'days') {
						// the date itself does not exist in this timezone (Pacific/Apia skipped 2011-12-30)
						continue;
					}
					// otherwise a week/month/year keeps add()'s next existing date
				}
			}
			rangeDates.push(formatter(step, template));
		}
		return rangeDates;
	}

	/**
	 * set method of Date instances changes
	 *
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @param {number} value
	 * @returns {KkDate}
	 */
	set(type, value) {
		// The wall clock in this instance's timezone is edited, then resolved back to an instant at
		// the new date's own offset (a DST change between the two dates keeps the wall-clock time).
		const timezone = effectiveTimezone(this);
		if (isSystemZone(timezone) && this.date.getFullYear() >= 100) {
			// System zone: a single local-time setter (one resolution, like wallClockToInstant);
			// keepOriginalSide() handles a DST overlap. The setters take the integer part of the value.
			// the original's local fields are already computed (getFullYear above): read them from it
			const original = this.date;
			const time = original.getTime();
			const local = new Date(time);
			let wallDelta;
			switch (type) {
				case 'seconds':
					wallDelta = (Math.trunc(+value) - original.getSeconds()) * 1000;
					local.setSeconds(value);
					break;
				case 'minutes':
					wallDelta = (Math.trunc(+value) - original.getMinutes()) * 60000;
					local.setMinutes(value);
					break;
				case 'hours':
					wallDelta = (Math.trunc(+value) - original.getHours()) * HOUR_MS;
					local.setHours(value);
					break;
				case 'days':
					wallDelta = (Math.trunc(+value) - original.getDate()) * DAY_MS;
					local.setDate(value);
					break;
				case 'months':
				case 'years': {
					// integer parts like the native setters (and the generic path): -0.5 is month 0
					const year = original.getFullYear();
					const month = original.getMonth();
					const day = original.getDate();
					const target = (type === 'years' ? Math.trunc(+value) - year : 0) * 12 + (type === 'months' ? Math.trunc(+value) : month);
					// normalized target month (12 -> January of the next year), day clamped like moment
					const targetYear = year + Math.floor(target / 12);
					const targetMonth = ((target % 12) + 12) % 12;
					const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
					local.setFullYear(targetYear, targetMonth, targetDay);
					wallDelta = (daysFromCivil(targetYear, targetMonth, targetDay) - daysFromCivil(year, month, day)) * DAY_MS;
					break;
				}
				default:
					throw new Error('type wrong');
			}
			this.date = keepOriginalSide(local, original, wallDelta);
			return this;
		}
		const time = this.date.getTime();
		const offset = offsetAt(timezone, time);
		const wall = new Date(time + offset);
		switch (type) {
			case 'seconds':
				wall.setUTCSeconds(value);
				break;
			case 'minutes':
				wall.setUTCMinutes(value);
				break;
			case 'hours':
				wall.setUTCHours(value);
				break;
			case 'days':
				wall.setUTCDate(value);
				break;
			case 'months':
				setYearMonthClamped(wall, wall.getUTCFullYear(), value);
				break;
			case 'years':
				setYearMonthClamped(wall, value, wall.getUTCMonth());
				break;
			default:
				throw new Error('type wrong');
		}
		// a wall clock that occurs twice (DST overlap) keeps the side of the original instant
		this.date = new Date(wallClockToInstant(timezone, wall.getTime(), offset));
		return this;
	}

	/**
	 * get method of Date instances
	 *
	 * @param {'seconds'|'minutes'|'hours'|'days'|'months'|'years'} type - The unit of time type
	 * @returns {number}
	 */
	get(type) {
		const wall = new Date(toWallClock(effectiveTimezone(this), this.date.getTime()));
		switch (type) {
			case 'seconds':
				return wall.getUTCSeconds();
			case 'minutes':
				return wall.getUTCMinutes();
			case 'hours':
				return wall.getUTCHours();
			case 'days':
				return wall.getUTCDate();
			case 'months':
				return wall.getUTCMonth();
			case 'years':
				return wall.getUTCFullYear();
			default:
				throw new Error('type is wrong');
		}
	}

	/**
	 * Formats the date according to the given template.
	 * Templates are compiled dynamically, so any combination of the supported tokens works,
	 * with [bracketed] literal text. Full moment/dayjs display-token vocabulary:
	 * year YYYY YY, month MMMM MMM MM Mo M, quarter Q Qo, day DD Do D,
	 * day of year DDDD DDDo DDD, weekday dddd ddd dd do d e E,
	 * week of year ww wo w + week-year gggg gg (weekStartDay-based, week 1 contains Jan 1),
	 * ISO week WW Wo W + ISO week-year GGGG GG, hour HH H hh h kk k,
	 * minute mm m, second ss s, fractional seconds S..SSSSSSSSS, meridiem A a,
	 * timezone Z ZZ z zz zzz and unix X x.
	 * A template with no recognizable token throws `Error('template is not right')`.
	 * Returns a `number` for the whole templates `'X'` (Unix seconds) and `'x'` (Unix
	 * milliseconds); inside larger templates X/x render as digit strings.
	 * Passing `null` or calling with no argument returns an ISO-style string with timezone offset (e.g. "2024-01-15T10:30:00+03:00").
	 *
	 * @param {string|null} [template] - Format template, e.g. 'YYYY-MM-DD', '[Week] w [of] gggg', 'DD.MM.YYYY HH:mm Z'
	 * @returns {string|number}
	 */
	format(template) {
		return formatter(this, template);
	}

	/**
	 * @description kk-date config for in call
	 * @param {object} options
	 * @param {string} options.locale BCP 47 language tag
	 * @param {string} options.timezone timezone
	 * @param {0|1|2|3|4|5|6} options.weekStartDay - The day of the week to start from (0 = Sunday, 1 = Monday ...)
	 * @returns {Error|KkDate}
	 */
	config(options = {}) {
		// Validate every option before touching the instance, so a failing call changes nothing.
		if (options.timezone) {
			checkTimezone(options.timezone);
		}
		if (typeof options.weekStartDay === 'number') {
			isValidWeekStartDay(options.weekStartDay);
		}
		let rtf = null;
		if (options.locale) {
			try {
				if (typeof Intl?.Locale === 'function') {
					new Intl.Locale(options.locale);
				}
				ensureInstanceLocaleFormatters(options.locale);
				if (typeof Intl?.RelativeTimeFormat === 'function') {
					rtf = new Intl.RelativeTimeFormat(options.locale, { numeric: 'auto' });
				}
			} catch {
				throw new Error('locale not valid for BCP 47, config error !');
			}
		}
		const temp_config = ownTempConfig(this);
		if (options.timezone) {
			temp_config.timezone = options.timezone;
			temp_config.rtf = {};
			this._fmt_sig = -1;
		}
		if (typeof options.weekStartDay === 'number') {
			temp_config.weekStartDay = options.weekStartDay;
			// week tokens (w/ww/wo/gg/gggg/e) depend on the week start
			this._fmt_sig = -1;
		}
		if (options.locale) {
			temp_config.locale = options.locale;
			if (rtf !== null) {
				temp_config.rtf[options.locale] = rtf;
			}
			this._fmt_sig = -1;
		}
		return this;
	}

	/**
	 * returns boolean about invalid date or not
	 * if invalid will be turn false
	 *
	 * @returns {boolean}
	 */
	isValid() {
		// Direct boolean equivalent of isInvalid(this.date) without the throw/catch round-trip,
		// so the invalid path allocates no Error object.
		return !!this.date && !Number.isNaN(this.date.valueOf());
	}

	/**
	 * returns native Date Object
	 *
	 * @returns {Date|Error}
	 */
	getDate() {
		isInvalid(this.date);
		return this.date;
	}

	/**
	 * @description It divides the date string into parts and returns an object.
	 * @param {number} time - Duration in seconds
	 * @returns {{years: number, months: number, weeks: number, days: number, hours: number, minutes: number, seconds: number}}
	 */
	duration(time) {
		return duration(time, 'seconds');
	}

	/**
	 * Convert to timezone
	 * @param {string} timezone
	 * @returns
	 */
	tz(timezone) {
		checkTimezone(timezone);
		ownTempConfig(this).timezone = timezone;
		this._fmt_sig = -1;
		this.date = parseWithTimezone(this);
		return this;
	}

	/**
	 * @description Get timezone information including DST status
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {object} - Timezone information
	 */
	getTimezoneInfo(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return getTimezoneInfo(targetTimezone, this.date);
	}

	/**
	 * @description Check if current date is in DST
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {boolean} - True if DST is active
	 */
	isDST(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return isDST(targetTimezone, this.date);
	}

	/**
	 * @description Get timezone abbreviation
	 * @param {string} timezone - IANA timezone identifier (optional, uses current timezone if not provided)
	 * @returns {string} - Timezone abbreviation
	 */
	getTimezoneAbbreviation(timezone = null) {
		const targetTimezone = timezone || this.temp_config.timezone || global_config.timezone;
		return getTimezoneAbbreviation(targetTimezone, this.date);
	}

	/**
	 * @description Returns startOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	startOf(unit) {
		this.date = new Date(startOfPeriod(this.date.getTime(), unit, effectiveTimezone(this), effectiveWeekStartDay(this)));
		return this;
	}

	/**
	 * @description returns endOf date of the unit of time.
	 * @param {'years'|'months'|'weeks'|'days'|'hours'|'minutes'|'seconds'} unit
	 * @returns {KkDate}
	 */
	endOf(unit) {
		this.date = new Date(endOfPeriod(this.date.getTime(), unit, effectiveTimezone(this), effectiveWeekStartDay(this)));
		return this;
	}

	/**
	 * @description Returns the relative time from now.
	 * @returns {string|Error} - "5 minutes ago"
	 */
	fromNow() {
		isInvalid(this.date);

		const locale = this.temp_config?.locale || global_config.locale || 'en';

		let rtf = this.temp_config.rtf[locale] || global_config.rtf[locale];

		if (!rtf) {
			if (typeof Intl?.RelativeTimeFormat !== 'function') {
				throw new Error(`fromNow() requires Intl.RelativeTimeFormat which is not available in this environment.`);
			}
			try {
				rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
				ownTempConfig(this).rtf[locale] = rtf;
			} catch (error) {
				throw new Error(`Failed to create Intl.RelativeTimeFormat for locale "${locale}": ${error.message || 'Unkown Error'}.`);
			}
		}

		// Like moment, every unit is rounded from the whole duration (no cascaded rounding, which
		// turned 90 seconds into "1 minute"), symmetrically for past and future, and months come
		// from the calendar. Thresholds are moment's: 45 s, 45 min, 22 h, 26 d, 11 months.
		const thisMs = this.date.getTime();
		const nowMs = Date.now();
		const diffMs = thisMs - nowMs;
		const sign = diffMs < 0 ? -1 : 1;
		const abs = Math.abs(diffMs);
		const seconds = Math.round(abs / 1000);
		const minutes = Math.round(abs / 60000);
		const hours = Math.round(abs / 3600000);
		const days = Math.round(abs / 86400000);

		let value;
		let unit; // ! READ: unit must be validate for .format !
		if (seconds < 45) {
			value = seconds;
			unit = 'second';
		} else if (minutes < 45) {
			value = Math.max(minutes, 1);
			unit = 'minute';
		} else if (hours < 22) {
			value = Math.max(hours, 1);
			unit = 'hour';
		} else if (days < 26) {
			value = Math.max(days, 1);
			unit = 'day';
		} else {
			const months = durationMonths(nowMs, thisMs, effectiveTimezone(this));
			if (Math.round(months) < 11) {
				value = Math.max(Math.round(months), 1);
				unit = 'month';
			} else {
				value = Math.max(Math.round(months / 12), 1);
				unit = 'year';
			}
		}

		try {
			return rtf.format(value === 0 ? 0 : sign * value, unit);
		} catch (error) {
			throw new Error(`couldn't format relative time: ${error.message || 'Unknown Error'}`);
		}
	}
}

/**
 *
 * @param {KkDate.date|Date} date
 * @returns
 */
function isInvalid(date) {
	try {
		if (!date) {
			throw new Error('Invalid Date');
		}
		if (Number.isNaN(date.valueOf())) {
			throw new Error('Invalid Date');
		}
	} catch {
		throw new Error('Invalid Date');
	}
	return true;
}

/**
 * isKkDate
 *
 * @param {KkDate} value
 * @returns {boolean}
 */
function isKkDate(value = {}) {
	if (value instanceof KkDate) {
		return true;
	}
	return false;
}

// Elapsed-time units: fixed lengths, so arithmetic on them is absolute (DST-independent).
const ELAPSED_UNIT_MS = { seconds: 1000, minutes: 60000, hours: 3600000 };

/**
 * Whether calendar arithmetic in `timezone` can use the engine's local-time methods directly.
 *
 * @param {string|undefined} timezone
 * @returns {boolean}
 */
function isSystemZone(timezone) {
	// A UTC system zone takes the generic path instead: its conversions are the identity there,
	// cheaper than the engine's local-time resolution.
	return (!timezone || timezone === systemTimezone) && !isUtcZone(timezone);
}

/**
 * The timezone an instance computes and displays in: its own .tz()/.config() zone, else the global one.
 *
 * @param {KkDate} kk
 * @returns {string|undefined}
 */
function effectiveTimezone(kk) {
	return kk.temp_config.timezone || global_config.timezone;
}

/**
 * The week start an instance uses: its own config, else the global one (an instance 0 wins).
 *
 * @param {KkDate} kk
 * @returns {number}
 */
function effectiveWeekStartDay(kk) {
	return kk.temp_config.weekStartDay ?? global_config.weekStartDay;
}

// From 1973 on every offset is a whole number of minutes, so Date#getTimezoneOffset is exact.
const WHOLE_MINUTE_OFFSETS_FROM = Date.UTC(1973, 0, 1);
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

/**
 * Wall clock (UTC-encoded ms) of a Date in `timezone`; for the system zone straight from the Date
 * itself (no allocation), otherwise via toWallClock.
 *
 * @param {string|undefined} timezone
 * @param {Date} date
 * @returns {number}
 */
function wallClockOf(timezone, date) {
	const ms = date.getTime();
	if (isSystemZone(timezone) && ms >= WHOLE_MINUTE_OFFSETS_FROM) {
		return ms - date.getTimezoneOffset() * 60000;
	}
	return toWallClock(timezone, ms);
}

/**
 * Rounds half away from zero (moment's absRound): 1.5 -> 2, -1.5 -> -2.
 *
 * @param {number} number
 * @returns {number}
 */
function absRound(number) {
	return number < 0 ? -Math.round(-number) : Math.round(number);
}

/**
 * The result of a system-zone fast path (native local-time setters, which resolve a wall clock
 * that occurs twice to the earlier instant), kept on the side of a DST overlap the operation
 * started from, as wallClockToInstant() does with a preferred offset (moment-timezone, Luxon).
 *
 * @param {Date} local - result of the native setters
 * @param {Date} original - the instant the operation started from
 * @param {number} wallDelta - how far the operation moved the wall clock (ms)
 * @returns {Date}
 */
function keepOriginalSide(local, original, wallDelta) {
	const result = local.getTime();
	// How much larger the offset in force at the result is than the original's (for a wall clock a
	// DST gap skips: the offset the engine resolved it with). Zero: the offset did not change; below
	// zero: the result is not the earlier reading of a repeated wall clock (that one has the larger
	// offset) — nothing to choose either way, and no offset lookup is needed.
	const grown = wallDelta - (result - original.getTime());
	if (!(grown > 0)) {
		return local;
	}
	// The same wall clock at the original's offset, if that reading exists (DST overlap).
	const candidate = result + grown;
	return systemOffsetAt(candidate) === systemOffsetAt(original.getTime()) ? new Date(candidate) : local;
}

/**
 * A new Date: `original` (system zone, year >= 100) moved by whole calendar months, month-end
 * clamped like moment (Jan 31 + 1 month = Feb 29), DST overlaps resolved like add().
 *
 * @param {Date} original
 * @param {number} months
 * @returns {Date}
 */
function addMonthsLocal(original, months) {
	const time = original.getTime();
	const year = original.getFullYear();
	const month = original.getMonth();
	const day = original.getDate();
	const target = month + months;
	const targetYear = year + Math.floor(target / 12);
	const targetMonth = ((target % 12) + 12) % 12;
	const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
	const local = new Date(time);
	local.setFullYear(targetYear, targetMonth, targetDay);
	return keepOriginalSide(local, original, (daysFromCivil(targetYear, targetMonth, targetDay) - daysFromCivil(year, month, day)) * DAY_MS);
}

/**
 * Days from 1970-01-01 to a proleptic Gregorian date (any year; H. Hinnant's days_from_civil).
 *
 * @param {number} year
 * @param {number} month0 - 0-11
 * @param {number} day - 1-31
 * @returns {number}
 */
function daysFromCivil(year, month0, day) {
	const y = month0 < 2 ? year - 1 : year;
	const era = Math.floor(y / 400);
	const yearOfEra = y - era * 400;
	const dayOfYear = Math.floor((153 * (month0 < 2 ? month0 + 10 : month0 - 2) + 2) / 5) + day - 1;
	return era * 146097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719468;
}

/**
 * Adds whole months to a UTC-encoded wall clock in place, clamping the day to the target month's
 * length (Jan 31 + 1 month = Feb 29, like moment).
 *
 * @param {Date} wall
 * @param {number} months
 */
function addMonthsToWall(wall, months) {
	const day = wall.getUTCDate();
	wall.setUTCDate(1);
	wall.setUTCMonth(wall.getUTCMonth() + months);
	wall.setUTCDate(Math.min(day, daysInMonth(wall.getUTCFullYear(), wall.getUTCMonth())));
}

/**
 * Sets year and month of a UTC-encoded wall clock in place, clamping the day to the target month's
 * length like moment (set('months', 1) on Jan 31 gives Feb 29, not Mar 2). A month outside 0-11
 * rolls into the neighbouring year; a non-numeric value leaves an Invalid Date.
 *
 * @param {Date} wall
 * @param {number} year
 * @param {number} month
 */
function setYearMonthClamped(wall, year, month) {
	const day = wall.getUTCDate();
	wall.setUTCDate(1);
	wall.setUTCFullYear(year, month);
	if (!Number.isNaN(wall.getTime())) {
		wall.setUTCDate(Math.min(day, daysInMonth(wall.getUTCFullYear(), wall.getUTCMonth())));
	}
}

/**
 * Instant (ms) of `ms` plus whole calendar months in `timezone` (wall-clock, month-end clamped).
 *
 * @param {number} ms
 * @param {number} months
 * @param {string|undefined} timezone
 * @returns {number}
 */
function addMonthsInstant(ms, months, timezone) {
	if (isSystemZone(timezone)) {
		const original = new Date(ms);
		if (original.getFullYear() >= 100) {
			return addMonthsLocal(original, months).getTime();
		}
	}
	const offset = offsetAt(timezone, ms);
	const wall = new Date(ms + offset);
	addMonthsToWall(wall, months);
	return wallClockToInstant(timezone, wall.getTime(), offset);
}

/**
 * First instant in (lo, hi] whose offset equals `offset` (the offset at `hi`; the one at `lo`
 * differs): the DST transition between them. Binary search to the millisecond — only reached for an
 * hour that a transition cuts (30-minute shifts, 45-minute offsets).
 *
 * @param {string|undefined} timezone
 * @param {number} lo
 * @param {number} hi
 * @param {number} offset
 * @returns {number}
 */
function transitionInstant(timezone, lo, hi, offset) {
	while (hi - lo > 1) {
		const mid = Math.floor((lo + hi) / 2);
		if (offsetAt(timezone, mid) === offset) {
			hi = mid;
		} else {
			lo = mid;
		}
	}
	return hi;
}

/**
 * Start of the period (unit) containing instant `ms` in `timezone`. Seconds/minutes/hours take the
 * wall-clock unit start under the instant's own offset (moment), so an hour inside a fall-back
 * repeat starts within that same repeat; when a transition falls inside the unit (30-minute DST
 * shifts, 45-minute offsets) the period starts at that transition — periods never straddle an offset
 * change. Days/weeks/months/years take the wall-clock start and resolve it to an instant; a midnight
 * skipped by DST resolves forward to the first instant of the day.
 *
 * @param {number} ms
 * @param {string} unit
 * @param {string|undefined} timezone
 * @param {number} weekStartDay
 * @returns {number}
 */
function startOfPeriod(ms, unit, timezone, weekStartDay) {
	const elapsed = ELAPSED_UNIT_MS[unit];
	if (elapsed !== undefined) {
		const offset = offsetAt(timezone, ms);
		const wall = ms + offset;
		const start = ms - (((wall % elapsed) + elapsed) % elapsed);
		if (Number.isNaN(start) || offsetAt(timezone, start) === offset) {
			return start;
		}
		return transitionInstant(timezone, start, ms, offset);
	}
	if (isSystemZone(timezone)) {
		const local = new Date(ms);
		const year = local.getFullYear();
		if (year >= 100) {
			// One Date construction resolves the period start like wallClockToInstant would.
			switch (unit) {
				case 'days':
					return new Date(year, local.getMonth(), local.getDate()).getTime();
				case 'weeks':
					return new Date(year, local.getMonth(), local.getDate() - ((local.getDay() - weekStartDay + 7) % 7)).getTime();
				case 'months':
					return new Date(year, local.getMonth(), 1).getTime();
				case 'years':
					return new Date(year, 0, 1).getTime();
				default:
					throw new Error(`Invalid unit for startOf: ${unit}`);
			}
		}
	}
	const wall = new Date(toWallClock(timezone, ms));
	switch (unit) {
		case 'days':
			break;
		case 'weeks':
			wall.setUTCDate(wall.getUTCDate() - ((wall.getUTCDay() - weekStartDay + 7) % 7));
			break;
		case 'months':
			wall.setUTCDate(1);
			break;
		case 'years':
			wall.setUTCMonth(0, 1);
			break;
		default:
			throw new Error(`Invalid unit for startOf: ${unit}`);
	}
	wall.setUTCHours(0, 0, 0, 0);
	return wallClockToInstant(timezone, wall.getTime());
}

/**
 * End of the period (unit) containing instant `ms` in `timezone`: the last millisecond before the
 * next period starts (moment). Unlike "23:59:59.999 on the wall clock", this is right on days whose
 * end is repeated or skipped by a DST transition at midnight.
 *
 * @param {number} ms
 * @param {string} unit
 * @param {string|undefined} timezone
 * @param {number} weekStartDay
 * @returns {number}
 */
function endOfPeriod(ms, unit, timezone, weekStartDay) {
	const elapsed = ELAPSED_UNIT_MS[unit];
	if (elapsed !== undefined) {
		const offset = offsetAt(timezone, ms);
		const wall = ms + offset;
		const end = ms - (((wall % elapsed) + elapsed) % elapsed) + elapsed - 1;
		if (Number.isNaN(end) || offsetAt(timezone, end) === offset) {
			return end;
		}
		// A transition cuts the unit after this instant: the period ends just before it.
		return transitionInstant(timezone, ms, end, offsetAt(timezone, end)) - 1;
	}
	if (isSystemZone(timezone)) {
		const local = new Date(ms);
		const year = local.getFullYear();
		if (year >= 100) {
			// The next period's start in one Date construction, minus 1 ms.
			switch (unit) {
				case 'days':
					return new Date(year, local.getMonth(), local.getDate() + 1).getTime() - 1;
				case 'weeks':
					return new Date(year, local.getMonth(), local.getDate() - ((local.getDay() - weekStartDay + 7) % 7) + 7).getTime() - 1;
				case 'months':
					return new Date(year, local.getMonth() + 1, 1).getTime() - 1;
				case 'years':
					return new Date(year + 1, 0, 1).getTime() - 1;
				default:
					throw new Error(`Invalid unit for endOf: ${unit}`);
			}
		}
	}
	const wall = new Date(toWallClock(timezone, ms));
	switch (unit) {
		case 'days':
			wall.setUTCDate(wall.getUTCDate() + 1);
			break;
		case 'weeks':
			wall.setUTCDate(wall.getUTCDate() - ((wall.getUTCDay() - weekStartDay + 7) % 7) + 7);
			break;
		case 'months':
			wall.setUTCMonth(wall.getUTCMonth() + 1, 1);
			break;
		case 'years':
			wall.setUTCFullYear(wall.getUTCFullYear() + 1, 0, 1);
			break;
		default:
			throw new Error(`Invalid unit for endOf: ${unit}`);
	}
	wall.setUTCHours(0, 0, 0, 0);
	return wallClockToInstant(timezone, wall.getTime()) - 1;
}

/**
 * Calendar-aware month difference from date `aDate` to `bDate` in `timezone` (positive when b is
 * later): moment's anchor arithmetic, including its swap when a's day of month is smaller than b's,
 * which keeps month-end pairs symmetric (Jan 30 -> Feb 29 next year is 13 months both ways).
 *
 * @param {Date} aDate
 * @param {Date} bDate
 * @param {string|undefined} timezone
 * @returns {number} fractional months
 */
function monthDiff(aDate, bDate, timezone) {
	const a = new Date(wallClockOf(timezone, aDate));
	const b = new Date(wallClockOf(timezone, bDate));
	if (a.getUTCDate() < b.getUTCDate()) {
		return -monthDiff(bDate, aDate, timezone);
	}
	const bMs = bDate.getTime();
	const wholeMonthDiff = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
	const anchor = monthAnchor(aDate, wholeMonthDiff, timezone);
	let adjust;
	if (bMs - anchor < 0) {
		const anchor2 = monthAnchor(aDate, wholeMonthDiff - 1, timezone);
		adjust = (bMs - anchor) / (anchor - anchor2);
	} else {
		const anchor2 = monthAnchor(aDate, wholeMonthDiff + 1, timezone);
		adjust = (bMs - anchor) / (anchor2 - anchor);
	}
	return wholeMonthDiff + adjust || 0;
}

/**
 * Instant (ms) of `date` plus whole calendar months in `timezone` (see addMonthsInstant), reading
 * the system-zone fields straight from the Date.
 *
 * @param {Date} date
 * @param {number} months
 * @param {string|undefined} timezone
 * @returns {number}
 */
function monthAnchor(date, months, timezone) {
	if (isSystemZone(timezone) && date.getFullYear() >= 100) {
		return addMonthsLocal(date, months).getTime();
	}
	return addMonthsInstant(date.getTime(), months, timezone);
}

/**
 * Length in months of the span between two instants the way moment's relative time measures it:
 * whole calendar months from the earlier instant (month-end clamped) plus the remaining days
 * converted at the average month length (146097 / 4800 days).
 *
 * @param {number} aMs
 * @param {number} bMs
 * @param {string|undefined} timezone
 * @returns {number} non-negative fractional months
 */
function durationMonths(aMs, bMs, timezone) {
	const earlier = Math.min(aMs, bMs);
	const later = Math.max(aMs, bMs);
	const e = new Date(toWallClock(timezone, earlier));
	const l = new Date(toWallClock(timezone, later));
	let months = (l.getUTCFullYear() - e.getUTCFullYear()) * 12 + (l.getUTCMonth() - e.getUTCMonth());
	let anchor = addMonthsInstant(earlier, months, timezone);
	if (anchor > later) {
		months--;
		anchor = addMonthsInstant(earlier, months, timezone);
	}
	return months + ((later - anchor) / 86400000) * (4800 / 146097);
}

/**
 * Difference from `start` to `end` in `type` units (positive when end is later). Seconds, minutes
 * and hours are elapsed time; days and weeks compare wall clocks in the start's timezone (a 23- or
 * 25-hour DST day still counts as one day, like moment); months and years are calendar-aware.
 *
 * @param {KkDate} start
 * @param {string|Date|KkDate|number} end
 * @param {'seconds'|'minutes'|'hours'|'days'|'weeks'|'months'|'years'} type
 * @returns {number} fractional value
 */
function diffValue(start, end, type) {
	const startMs = start.getTime();
	const endKk = isKkDate(end) ? end : new KkDate(end);
	const endMs = endKk.getTime();
	switch (type) {
		case 'seconds':
			return (endMs - startMs) / 1000;
		case 'minutes':
			return (endMs - startMs) / 1000 / 60;
		case 'hours':
			return (endMs - startMs) / 1000 / 3600;
		case 'days':
		case 'weeks': {
			const timezone = effectiveTimezone(start);
			const days = (wallClockOf(timezone, endKk.date) - wallClockOf(timezone, start.date)) / 1000 / 86400;
			return type === 'weeks' ? days / 7 : days;
		}
		case 'months':
			return monthDiff(start.date, endKk.date, effectiveTimezone(start));
		case 'years':
			return monthDiff(start.date, endKk.date, effectiveTimezone(start)) / 12;
		default:
			throw new Error('invalid type for diff');
	}
}

/**
 * Locale for the toLocale*() methods: the instance locale, else the global locale once it was
 * configured, else undefined (the runtime default — the behavior before any configuration).
 *
 * @param {KkDate} kk
 * @returns {string|undefined}
 */
function displayLocale(kk) {
	return kk.temp_config.locale || (global_config.localeConfigured ? global_config.locale : undefined);
}

/**
 * Options for the toLocale*() methods: the caller's options, with the instance/global timezone as
 * the default timeZone (so they display in the same zone as format()).
 *
 * @param {KkDate} kk
 * @param {Intl.DateTimeFormatOptions|undefined} options
 * @returns {Intl.DateTimeFormatOptions|undefined}
 */
function displayOptions(kk, options) {
	const timeZone = effectiveTimezone(kk);
	if (!timeZone || (options && options.timeZone !== undefined)) {
		return options;
	}
	return options ? { ...options, timeZone } : { timeZone };
}

/**
 * Builds (bounded, memoized) the per-locale name formatters an instance .config({ locale }) uses.
 *
 * @param {string} locale
 */
function ensureInstanceLocaleFormatters(locale) {
	const temp = cached_dateTimeFormat.temp;
	if (temp.dddd.has(locale) && temp.MMM.has(locale)) {
		return;
	}
	const formatters = {
		dddd: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
		ddd: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		dd: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		MMMM: new Intl.DateTimeFormat(locale, { month: 'long' }),
		MMM: new Intl.DateTimeFormat(locale, { month: 'short' }),
	};
	for (const token in formatters) {
		boundedSet(temp[token], locale, formatters[token]);
	}
}

// Formatter result cache, two levels: outer key is the template (an interned
// literal, cheap to hash), inner key packs timestamp and config signature into
// one number — no per-call key string is built on the hot path.
// A config signature interns the resolved (timezone, locale, detected_format,
// weekStartDay) tuple to a small int, cached per instance and recomputed when
// the instance's temp_config or the global config changes (format_config_version).
let formatter_cache_count = 0;
let format_config_version = 0;
const format_sig_intern = new Map();

function formatSig(orj_this) {
	const timezone = orj_this.temp_config.timezone || global_config.timezone || 'none';
	const locale = orj_this.temp_config.locale || global_config.locale || 'none';
	// weekStartDay feeds the w/ww/wo/gg/gggg/e tokens — cached results must not
	// survive a week-start change. ?? so an instance override of 0 wins.
	const weekStartDay = orj_this.temp_config.weekStartDay ?? global_config.weekStartDay ?? 0;
	const key = `${timezone}_${locale}_${orj_this.detected_format || 'none'}_${weekStartDay}`;
	let sig = format_sig_intern.get(key);
	if (sig === undefined) {
		if (format_sig_intern.size >= 1024) {
			// Sig ids are baked into cached sub-keys and per-instance caches:
			// reset everything together so stale ids can never collide.
			format_sig_intern.clear();
			formatter_cache.clear();
			formatter_cache_count = 0;
			format_config_version++;
		}
		sig = format_sig_intern.size;
		format_sig_intern.set(key, sig);
	}
	orj_this._fmt_sig = sig;
	orj_this._fmt_sig_v = format_config_version;
	return sig;
}

/**
 *
 * @param {Date} this.date
 * @param {string} template
 * @returns {string}
 */
function formatter(orj_this, template = null) {
	isInvalid(orj_this.date);

	const timestamp = orj_this.date.getTime();

	// Unix timestamp templates need only the timestamp — return before touching the cache.
	if (template === 'x') {
		// Unix timestamp in milliseconds - always UTC, no timezone conversion
		return timestamp;
	}
	if (template === 'X') {
		// Unix timestamp in seconds - always UTC, no timezone conversion
		return Math.floor(timestamp / 1000);
	}

	let sig = orj_this._fmt_sig;
	if (sig < 0 || orj_this._fmt_sig_v !== format_config_version) {
		sig = formatSig(orj_this);
	}
	// |timestamp| < 2^43 (±year ~2248) packs losslessly into ts*1024+sig; anything
	// beyond falls back to a string sub-key.
	const subKey = timestamp < 8796093022208 && timestamp > -8796093022208 ? timestamp * 1024 + sig : `${timestamp}_${sig}`;

	let byTemplate = formatter_cache.get(template);
	if (byTemplate !== undefined) {
		const cachedResult = byTemplate.get(subKey);
		if (cachedResult !== undefined) {
			return cachedResult;
		}
	}

	// Determine if this is a UTC date (ISO8601 format) or if timezone is explicitly UTC
	const timezone = orj_this.temp_config.timezone || global_config.timezone;
	const isUTC = orj_this.detected_format === 'ISO8601' || timezone === 'UTC';

	// Throws for templates without any token — before anything is cached, so failing templates
	// never leave (unbounded) empty entries behind.
	const result = _formatterCore(orj_this, template, isUTC);

	// Limit total cached results to prevent memory leaks
	if (formatter_cache_count > 10000) {
		formatter_cache.clear();
		formatter_cache_count = 0;
		byTemplate = undefined;
	}
	if (byTemplate === undefined) {
		byTemplate = new Map();
		formatter_cache.set(template, byTemplate);
	}
	// Store result in cache
	byTemplate.set(subKey, result);
	formatter_cache_count++;
	return result;
}

/**
 * UTC offset in minutes of the instance's target timezone at its instant
 * (temp_config over global_config; system offset when neither is set).
 *
 * @param {KkDate} orj_this
 * @returns {number}
 */
function getTargetOffsetMinutes(orj_this) {
	const targetTimezone = orj_this.temp_config.timezone || global_config.timezone;
	if (targetTimezone) {
		if (targetTimezone === 'UTC') {
			return 0;
		}
		return getTimezoneOffset(targetTimezone, orj_this.date) / 60000;
	}
	return -orj_this.date.getTimezoneOffset();
}

/**
 * A year below 1000 with four digits, like moment and dayjs ('0050'); negative years unchanged.
 *
 * @param {number|string} year
 * @returns {string}
 */
function padYear(year) {
	const text = String(year);
	return text[0] === '-' ? text : text.padStart(4, '0');
}

/**
 * Renders offset minutes as ±HH<separator>mm (Z → '+03:00', ZZ → '+0300').
 *
 * @param {number} offsetMinutes
 * @param {string} separator
 * @returns {string}
 */
function formatUtcOffset(offsetMinutes, separator) {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	// Historical local-mean-time offsets have seconds (+01:55:52); like moment, Z/ZZ show the
	// whole minutes (+01:55).
	const absOffset = Math.floor(Math.abs(offsetMinutes));
	return `${sign}${padZero(Math.floor(absOffset / 60))}${separator}${padZero(absOffset % 60)}`;
}

function _formatterCore(orj_this, template, isUTC) {
	if (template === null) {
		// When template is null, always return YYYY-MM-DDTHH:mm:ss format with timezone offset
		const timezoneOffset = getTargetOffsetMinutes(orj_this);
		const result = converter(orj_this.date, ['day', 'month', 'year', 'hours', 'minutes', 'seconds'], {
			isUTC,
			detectedFormat: orj_this.detected_format,
			orj_this: orj_this,
		});
		return `${result.year >= 1000 ? result.year : padYear(result.year)}-${result.month}-${result.day}T${result.hours}:${result.minutes}:${result.seconds}${formatUtcOffset(timezoneOffset, ':')}`;
	}

	const compiled = getCompiledTemplate(template);
	const values = compiled.fields.length
		? converter(orj_this.date, compiled.fields, { isUTC, detectedFormat: orj_this.detected_format, orj_this: orj_this })
		: null;
	// Meridiem comes from the original 24h value, before the %12 conversion below.
	let meridiem = null;
	if (compiled.has12h) {
		meridiem = parseInt(values.hours, 10) >= 12 ? 'PM' : 'AM';
	}
	// Derived values (weekday, day of year, weeks, offset) are computed at most
	// once per call and only when the compiled template marked them as needed.
	// Every token behind YMD/DOW/DOY/*_WEEK registers year/month/day fields,
	// so values is never null when those bits are set.
	const needs = compiled.derived;
	let yearNum = 0;
	let monthNum = 0;
	let dayNum = 0;
	let dayOfWeek = 0;
	let dayOfYear = 0;
	let isoWeek = null;
	let localeWeek = null;
	let offsetMinutes = 0;
	if (needs !== 0) {
		if (needs & format_derived_flags.YMD) {
			yearNum = +values.year;
			monthNum = +values.month;
			dayNum = +values.day;
		}
		if (needs & format_derived_flags.DOW) {
			dayOfWeek = getDayOfWeek(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.DOY) {
			dayOfYear = getDayOfYear(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.ISO_WEEK) {
			isoWeek = getIsoWeekInfo(yearNum, monthNum, dayNum);
		}
		if (needs & format_derived_flags.LOCALE_WEEK) {
			localeWeek = getLocaleWeekInfo(yearNum, monthNum, dayNum, orj_this.temp_config.weekStartDay ?? global_config.weekStartDay);
		}
		if (needs & format_derived_flags.OFFSET) {
			offsetMinutes = getTargetOffsetMinutes(orj_this);
		}
	}
	const parts = compiled.parts;
	const parts_length = parts.length;
	let out = '';
	for (let i = 0; i < parts_length; i++) {
		const part = parts[i];
		switch (part.t) {
			case format_part_types.LITERAL:
				out += part.v;
				break;
			case format_part_types.YEAR:
				// a number on the native converter path, a string on the Intl paths
				out += values.year >= 1000 ? values.year : padYear(values.year);
				break;
			case format_part_types.MONTH:
				out += values.month;
				break;
			case format_part_types.DAY:
				out += values.day;
				break;
			case format_part_types.HOURS:
				out += values.hours;
				break;
			case format_part_types.MINUTES:
				out += values.minutes;
				break;
			case format_part_types.SECONDS:
				out += values.seconds;
				break;
			case format_part_types.MILLISECONDS:
				out += values.milliseconds;
				break;
			case format_part_types.NAME:
				out += formatNameToken(orj_this, part.v);
				break;
			case format_part_types.HOUR12: {
				let hours = parseInt(values.hours, 10) % 12;
				if (hours === 0) {
					hours = 12;
				}
				out += hours < 10 ? `0${hours}` : hours;
				break;
			}
			case format_part_types.DAY_UNPADDED: {
				const day = values.day;
				out += day[0] === '0' ? day.slice(1) : day;
				break;
			}
			case format_part_types.DAY_ORDINAL:
				out += getOrdinal(parseInt(values.day, 10));
				break;
			case format_part_types.MERIDIEM_UPPER:
				out += meridiem;
				break;
			case format_part_types.MERIDIEM_LOWER:
				out += meridiem === 'PM' ? 'pm' : 'am';
				break;
			case format_part_types.YEAR2: {
				// Year is a number on the native converter path, a string on the Intl paths.
				const year = String(values.year);
				out += year.length >= 2 ? year.slice(-2) : year.padStart(2, '0');
				break;
			}
			case format_part_types.MONTH_UNPADDED: {
				const month = values.month;
				out += month[0] === '0' ? month.slice(1) : month;
				break;
			}
			case format_part_types.MONTH_ORDINAL:
				out += getOrdinal(parseInt(values.month, 10));
				break;
			case format_part_types.QUARTER:
				out += Math.ceil(parseInt(values.month, 10) / 3);
				break;
			case format_part_types.QUARTER_ORDINAL:
				out += getOrdinal(Math.ceil(parseInt(values.month, 10) / 3));
				break;
			case format_part_types.DAY_OF_YEAR:
				out += dayOfYear;
				break;
			case format_part_types.DAY_OF_YEAR_ORDINAL:
				out += getOrdinal(dayOfYear);
				break;
			case format_part_types.DAY_OF_YEAR_PADDED:
				out += dayOfYear < 100 ? (dayOfYear < 10 ? `00${dayOfYear}` : `0${dayOfYear}`) : dayOfYear;
				break;
			case format_part_types.WEEKDAY:
				out += dayOfWeek;
				break;
			case format_part_types.WEEKDAY_ORDINAL:
				out += getOrdinal(dayOfWeek);
				break;
			case format_part_types.WEEKDAY_LOCALE:
				out += (dayOfWeek - (orj_this.temp_config.weekStartDay ?? global_config.weekStartDay) + 7) % 7;
				break;
			case format_part_types.WEEKDAY_ISO:
				out += dayOfWeek === 0 ? 7 : dayOfWeek;
				break;
			case format_part_types.WEEK:
				out += localeWeek.week;
				break;
			case format_part_types.WEEK_ORDINAL:
				out += getOrdinal(localeWeek.week);
				break;
			case format_part_types.WEEK_PADDED:
				out += localeWeek.week < 10 ? `0${localeWeek.week}` : localeWeek.week;
				break;
			case format_part_types.WEEK_YEAR2:
				out += String(localeWeek.year).slice(-2);
				break;
			case format_part_types.WEEK_YEAR:
				out += localeWeek.year;
				break;
			case format_part_types.ISO_WEEK:
				out += isoWeek.week;
				break;
			case format_part_types.ISO_WEEK_ORDINAL:
				out += getOrdinal(isoWeek.week);
				break;
			case format_part_types.ISO_WEEK_PADDED:
				out += isoWeek.week < 10 ? `0${isoWeek.week}` : isoWeek.week;
				break;
			case format_part_types.ISO_WEEK_YEAR2:
				out += String(isoWeek.year).slice(-2);
				break;
			case format_part_types.ISO_WEEK_YEAR:
				out += isoWeek.year;
				break;
			case format_part_types.HOURS_UNPADDED: {
				const hours = values.hours;
				out += hours[0] === '0' ? hours.slice(1) : hours;
				break;
			}
			case format_part_types.HOUR12_UNPADDED: {
				let hours = parseInt(values.hours, 10) % 12;
				if (hours === 0) {
					hours = 12;
				}
				out += hours;
				break;
			}
			case format_part_types.HOUR24: {
				// 1-24 clock: midnight renders as 24.
				const hours = parseInt(values.hours, 10);
				out += hours === 0 ? 24 : hours;
				break;
			}
			case format_part_types.HOUR24_PADDED: {
				const hours = parseInt(values.hours, 10);
				out += hours === 0 ? '24' : hours < 10 ? `0${hours}` : hours;
				break;
			}
			case format_part_types.MINUTES_UNPADDED: {
				const minutes = values.minutes;
				out += minutes[0] === '0' ? minutes.slice(1) : minutes;
				break;
			}
			case format_part_types.SECONDS_UNPADDED: {
				const seconds = values.seconds;
				out += seconds[0] === '0' ? seconds.slice(1) : seconds;
				break;
			}
			case format_part_types.MS_FRACTION: {
				// milliseconds is always a 3-char padded string: S/SS truncate,
				// SSSS..SSSSSSSSS right-pad with zeros (moment semantics).
				const digits = part.v.length;
				out += digits < 3 ? values.milliseconds.slice(0, digits) : values.milliseconds.padEnd(digits, '0');
				break;
			}
			case format_part_types.OFFSET_COLON:
				out += formatUtcOffset(offsetMinutes, ':');
				break;
			case format_part_types.OFFSET_BASIC:
				out += formatUtcOffset(offsetMinutes, '');
				break;
			case format_part_types.TZ_ABBR:
				out += getTimezoneAbbreviation(orj_this.temp_config.timezone || global_config.timezone || systemTimezone, orj_this.date);
				break;
			case format_part_types.TZ_LONG:
				out += getTimezoneLongName(
					orj_this.temp_config.timezone || global_config.timezone || systemTimezone,
					orj_this.date,
					orj_this.temp_config.locale || global_config.locale,
				);
				break;
			case format_part_types.UNIX_SECONDS:
				out += Math.floor(orj_this.date.getTime() / 1000);
				break;
			case format_part_types.UNIX_MS:
				out += orj_this.date.getTime();
				break;
		}
	}
	if (compiled.appendMeridiem) {
		out += ` ${meridiem}`;
	}
	return out;
}

/**
 * Formats a locale-aware name token (dddd/ddd/dd/MMMM/MMM) for the date,
 * memoized in nope-redis per token, locale/timezone formatter and timestamp.
 * dd is the short weekday name sliced to its first two characters (the
 * closest Intl equivalent of moment's "min" weekday names).
 *
 * @param {KkDate} orj_this
 * @param {string} token
 * @returns {string}
 */
function formatNameToken(orj_this, token) {
	const formatter = dateTimeFormat(orj_this, token);
	const cache_key = `${token}_${formatter.id}_${orj_this.date.getTime()}`;
	const cache = nopeRedis.getItem(cache_key);
	// the store is shared with the constructor's parse cache, whose keys are arbitrary input text
	if (typeof cache === 'string') {
		return cache;
	}
	let value = formatter.value.format(orj_this.date);
	if (token === 'dd') {
		value = value.slice(0, 2);
	}
	nopeRedis.setItemSync(cache_key, value);
	return value;
}

/**
 * validation
 *
 * Accepts every predefined template plus any display-token template the formatter
 * understands (compiled on first use). Templates with no recognizable token throw
 * 'Invalid template !'.
 *
 * @param {KkDate.date_string} date_string
 * @param {string} template
 * @param {boolean} [is_strict=false] - Layers wall-clock semantics on top of the shape check
 * (moment strict parity): 4-digit years 1700-2199, real calendar days incl. leap years,
 * hours 00-23 plus exactly 24:00[:00], and no :ss tail on HH:mm.
 * @returns {boolean}
 */
function isValid(date_string, template, is_strict = false) {
	// Weekday names: any input in default mode (legacy); strict requires a long weekday name
	// (any supported language), like moment strict 'dddd'.
	if (template === TEMPLATE_DDDD) {
		return !is_strict || (typeof date_string === 'string' && isNameOfForm(date_string, TEMPLATE_DDDD));
	}

	// Hot path: hand-written charCode validators for the predefined numeric templates.
	// Default mode replicates the legacy regexes bit-for-bit; is_strict layers wall-clock
	// hours (24 only as exactly 24:00[:00]), 4-digit years (1700-2199) and real-calendar
	// day checks on top (moment strict parity).
	const validator = format_validators.get(template);
	if (validator !== undefined) {
		return validator(date_string, is_strict);
	}

	// Remaining predefined templates (name/unicode based, 12-hour times, 'YYYY-MM-DD HH' family)
	// keep their legacy regexes; is_strict adds the moment-strict field checks on top (known
	// month/weekday names, real calendar days, 4-digit years, wall-clock hours, ordinal on Do).
	const regex = format_types_regex_cache.get(template);
	if (regex !== undefined) {
		if (!regex.test(date_string)) {
			return false;
		}
		return !is_strict || strictTemplateCheck(template, `${date_string}`);
	}

	// Any other display-token template is compiled into a validator on first use.
	// Templates with no recognizable token keep throwing 'Invalid template !'.
	return validateDynamicTemplate(template, date_string, is_strict);
}

/**
 * @description checks the number of week start day
 * @param {number} weekStartDay
 * @returns {boolean}
 */
function isValidWeekStartDay(weekStartDay) {
	if (typeof weekStartDay !== 'number' || !Number.isInteger(weekStartDay)) {
		throw new Error('weekStartDay must be an integer');
	}
	if (weekStartDay < 0 || weekStartDay > 6) {
		throw new Error('weekStartDay must be between 0 and 6');
	}
	return true;
}

/**
 * @description It configures the global config.
 * @param {Object} options
 * @param {string} options.locale
 * @param {string} options.timezone
 * @param {0|1|2|3|4|5|6} options.weekStartDay - The day of the week to start from (0 = Sunday, 1 = Monday ...)
 * @returns {boolean}
 */
function config(options = {}) {
	// Validate every option before applying any: a call that throws (e.g. a valid locale with an
	// invalid timezone) must leave the global configuration — and every cached format — untouched.
	let localeFormatters = null;
	let rtf = null;
	if (options.locale) {
		try {
			if (typeof Intl?.Locale === 'function') {
				new Intl.Locale(options.locale);
			}
			localeFormatters = {
				dddd: new Intl.DateTimeFormat(options.locale, { weekday: 'long' }),
				ddd: new Intl.DateTimeFormat(options.locale, { weekday: 'short' }),
				dd: new Intl.DateTimeFormat(options.locale, { weekday: 'short' }),
				MMMM: new Intl.DateTimeFormat(options.locale, { month: 'long' }),
				MMM: new Intl.DateTimeFormat(options.locale, { month: 'short' }),
			};
			if (typeof Intl?.RelativeTimeFormat === 'function') {
				try {
					rtf = new Intl.RelativeTimeFormat(options.locale, { numeric: 'auto' });
				} catch {
					throw new Error('locale not valid for BCP 47 / relative time formatting');
				}
			}
		} catch (error) {
			throw new Error(error.message || 'locale not valid for BCP 47 / config');
		}
	}
	if (typeof options.weekStartDay === 'number') {
		isValidWeekStartDay(options.weekStartDay);
	}
	const timezoneChanges = !!options.timezone && global_config.timezone !== options.timezone;
	if (timezoneChanges) {
		checkTimezone(options.timezone);
	}

	if (localeFormatters !== null) {
		global_config.locale = options.locale;
		global_config.localeConfigured = true;
		cached_dateTimeFormat.dddd = localeFormatters.dddd;
		cached_dateTimeFormat.ddd = localeFormatters.ddd;
		cached_dateTimeFormat.dd = localeFormatters.dd;
		cached_dateTimeFormat.MMMM = localeFormatters.MMMM;
		cached_dateTimeFormat.MMM = localeFormatters.MMM;
		if (rtf !== null) {
			global_config.rtf[options.locale] = rtf;
		}
	}
	if (typeof options.weekStartDay === 'number') {
		global_config.weekStartDay = options.weekStartDay;
	}
	if (timezoneChanges) {
		global_config.timezone = options.timezone;
		timezone_shift_enabled = global_config.timezone !== systemTimezone;
		updateWallCapture();
	}
	if (options.locale || options.timezone || typeof options.weekStartDay === 'number') {
		// Existing instances may have cached a config signature that resolved
		// through the old global timezone/locale/weekStartDay — force recomputation.
		format_config_version++;
	}
	return true;
}

/**
 * caching config
 *
 * @param {object} options
 * @param {boolean} options.status
 * @param {number|null} options.defaultTtl
 * @returns {boolean}
 */
function caching(options = { status: false, defaultTtl: null }) {
	if (typeof options.status === 'boolean') {
		if (options.status) {
			nopeRedis.SERVICE_START();
			cachingEnabled = true;
		} else {
			nopeRedis.SERVICE_KILL_SYNC();
			cachingEnabled = false;
		}
	}
	if (typeof options.defaultTtl === 'number') {
		nopeRedis.config({ defaultTtl: options.defaultTtl });
	}
	return true;
}

/**
 * caching config
 *
 * @param {boolean} status
 */
function caching_status() {
	return nopeRedis.stats({ showKeys: false, showTotal: true, showSize: true });
}

// kk date export default
module.exports = KkDate;

// another functions export
module.exports.config = config;
module.exports.duration = duration;
module.exports.caching = caching;
module.exports.caching_status = caching_status;
module.exports.caching_flush = nopeRedis.flushAll;
module.exports.isValid = isValid;
module.exports.getTimezoneInfo = getTimezoneInfo;
module.exports.convertToTimezone = convertToTimezone;
module.exports.getAvailableTimezones = getAvailableTimezones;
module.exports.isDST = isDST;
module.exports.getTimezoneAbbreviation = getTimezoneAbbreviation;
module.exports.checkTimezone = checkTimezone;
module.exports.getTimezoneOffset = getTimezoneOffset;

// Global timezone configuration functions
module.exports.getTimezone = () => global_config.timezone;
module.exports.setTimezone = (timezone) => {
	checkTimezone(timezone);
	global_config.timezone = timezone;
	timezone_shift_enabled = global_config.timezone !== systemTimezone;
	updateWallCapture();
	// Existing instances may have cached a config signature that resolved
	// through the old global timezone — force recomputation (see formatSig).
	format_config_version++;
};
module.exports.getUserTimezone = () => global_config.userTimezone;
module.exports.setUserTimezone = (timezone) => {
	checkTimezone(timezone);
	global_config.userTimezone = timezone;
};
