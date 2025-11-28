// Type definitions for kk-date
// Project: https://github.com/kentkartlab/kk-date
// Definitions by: Kentkart Lab

export = KkDate;

declare class KkDate {
	/**
	 * The underlying Date object
	 */
	date: Date;

	/**
	 * Detected format of the input
	 */
	detected_format: string | null;

	/**
	 * Temporary configuration for this instance
	 */
	temp_config: Partial<KkDate.TempConfig>;

	/**
	 * Creates a new KkDate instance
	 * @param date - Date input (string, Date, KkDate, or timestamp)
	 * @param format - Optional format string for parsing
	 * @throws Error if date is invalid
	 */
	constructor(date?: string | Date | KkDate | number, format?: KkDate.FormatType);

	/**
	 * Returns the timestamp in milliseconds
	 */
	getTime(): number;

	/**
	 * Internal helper to get timestamp from various input types
	 * @internal
	 */
	private _getTimestamp(date: string | Date | KkDate | number): number;

	/**
	 * Checks if this date is before another date
	 */
	isBefore(date: string | Date | KkDate | number): boolean;

	/**
	 * Checks if this date is same or before another date
	 */
	isSameOrBefore(date: string | Date | KkDate | number): boolean;

	/**
	 * Checks if this date is after another date
	 */
	isAfter(date: string | Date | KkDate | number): boolean;

	/**
	 * Checks if this date is same or after another date
	 */
	isSameOrAfter(date: string | Date | KkDate | number): boolean;

	/**
	 * Checks if this date is the same as another date
	 */
	isSame(date: string | Date | KkDate | number): boolean;

	/**
	 * Checks if this date is between two dates
	 * @param start - Start date
	 * @param end - End date
	 * @param unit - Unit for comparison (default: 'milliseconds')
	 */
	isBetween(
		start: string | Date | KkDate | number,
		end: string | Date | KkDate | number,
		unit?: KkDate.TimeUnit | 'milliseconds'
	): boolean;

	/**
	 * Returns string representation of the date
	 */
	toString(): string;

	/**
	 * Returns date string (date portion only)
	 */
	toDateString(): string;

	/**
	 * Returns ISO 8601 string (UTC)
	 */
	toISOString(): string;

	/**
	 * Returns JSON representation (same as toISOString)
	 */
	toJSON(): string;

	/**
	 * Returns UTC string in RFC 7231 format
	 */
	toUTCString(): string;

	/**
	 * Returns locale-specific date string
	 */
	toLocaleDateString(options?: Intl.DateTimeFormatOptions): string;

	/**
	 * Returns locale-specific date and time string
	 */
	toLocaleString(options?: Intl.DateTimeFormatOptions): string;

	/**
	 * Returns locale-specific time string
	 */
	toLocaleTimeString(options?: Intl.DateTimeFormatOptions): string;

	/**
	 * Returns time string (time portion only)
	 */
	toTimeString(): string;

	/**
	 * Returns timestamp in milliseconds
	 */
	valueOf(): number;

	/**
	 * Returns local timestamp value adjusted for timezone
	 */
	valueOfLocal(check_error?: boolean): number;

	/**
	 * Adds time to the date
	 * @param amount - Amount to add (can be negative to subtract)
	 * @param type - Unit of time
	 * @returns This instance for chaining
	 */
	add(amount: number | KkDate.DurationObject, type?: KkDate.TimeUnit): this;

	/**
	 * Calculates difference between this date and another
	 * @param end - End date
	 * @param type - Unit for the result
	 * @param is_decimal - Whether to return decimal value
	 */
	diff(end: string | Date | KkDate | number, type: KkDate.TimeUnit, is_decimal?: boolean): number;

	/**
	 * Returns array of formatted dates between this date and end date
	 * @param end - End date
	 * @param type - Unit for stepping
	 * @param template - Format template for output
	 */
	diff_range(end: string | Date | KkDate | number, type: KkDate.TimeUnit, template?: KkDate.FormatType): string[];

	/**
	 * Sets a specific unit of the date
	 * @param type - Unit to set
	 * @param value - Value to set
	 * @returns This instance for chaining
	 */
	set(type: KkDate.TimeUnit, value: number): this;

	/**
	 * Gets a specific unit of the date
	 * @param type - Unit to get
	 */
	get(type: KkDate.TimeUnit): number;

	/**
	 * Formats date with multiple templates joined by separator
	 * @param separator - Separator between formatted parts
	 * @param template - Format templates
	 */
	format_c(separator: string, ...template: KkDate.FormatType[]): string;

	/**
	 * Formats the date according to template
	 * @param template - Format template (null returns ISO format with timezone offset)
	 */
	format(template?: KkDate.FormatType | null): string;

	/**
	 * Configures this instance
	 * @param options - Configuration options
	 * @returns This instance for chaining
	 */
	config(options: KkDate.InstanceConfigOptions): this;

	/**
	 * Checks if the date is valid
	 */
	isValid(): boolean;

	/**
	 * Returns the underlying Date object
	 */
	getDate(): Date;

	/**
	 * Creates a duration object from time value (in seconds)
	 * @param time - Time value in seconds
	 */
	duration(time: number): KkDate.DurationResult;

	/**
	 * Sets display timezone for this instance
	 * @param timezone - IANA timezone identifier
	 * @returns This instance for chaining
	 */
	tz(timezone: string): this;

	/**
	 * Gets timezone information
	 * @param timezone - IANA timezone identifier (optional)
	 */
	getTimezoneInfo(timezone?: string | null): KkDate.TimezoneInfo;

	/**
	 * Checks if date is in DST for given timezone
	 * @param timezone - IANA timezone identifier (optional)
	 */
	isDST(timezone?: string | null): boolean;

	/**
	 * Gets timezone abbreviation
	 * @param timezone - IANA timezone identifier (optional)
	 */
	getTimezoneAbbreviation(timezone?: string | null): string;

	/**
	 * Sets date to start of the given unit
	 * @param unit - Time unit
	 * @returns This instance for chaining
	 */
	startOf(unit: KkDate.PeriodUnit): this;

	/**
	 * Sets date to end of the given unit
	 * @param unit - Time unit
	 * @returns This instance for chaining
	 */
	endOf(unit: KkDate.PeriodUnit): this;

	/**
	 * Returns relative time string from now
	 * @example "5 minutes ago", "in 2 hours"
	 */
	fromNow(): string;
}

declare namespace KkDate {
	/**
	 * Time units for manipulation and comparison
	 */
	type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years';

	/**
	 * Period units for startOf/endOf
	 */
	type PeriodUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

	/**
	 * Supported format types
	 */
	type FormatType =
		// Year formats
		| 'YYYY'
		| 'YYYY-MM'
		| 'YYYY-MM-DD'
		| 'YYYY-DD-MM'
		| 'YYYY-MM-DD HH'
		| 'YYYY-MM-DD HH:mm'
		| 'YYYY-MM-DD HH:mm:ss'
		| 'YYYY-MM-DDTHH:mm:ss'
		| 'YYYYMMDD'
		// Year with dot separator
		| 'YYYY.MM.DD'
		| 'YYYY.MM.DD HH'
		| 'YYYY.MM.DD HH:mm'
		| 'YYYY.MM.DD HH:mm:ss'
		// Day first with dot separator
		| 'DD.MM.YYYY'
		| 'DD.MM.YYYY HH:mm'
		| 'DD.MM.YYYY HH:mm:ss'
		// Day first with dash separator
		| 'DD-MM-YYYY'
		| 'DD-MM-YYYY HH'
		| 'DD-MM-YYYY HH:mm'
		| 'DD-MM-YYYY HH:mm:ss'
		// Slash formats
		| 'DD/MM/YYYY'
		| 'MM/DD/YYYY'
		// Month/Day only
		| 'MM'
		| 'DD'
		// Time formats
		| 'HH'
		| 'mm'
		| 'ss'
		| 'HH:mm'
		| 'HH:mm:ss'
		| 'HH:mm:ss.SSS'
		| 'hh:mm'
		| 'hh:mm:ss'
		| 'hh:mm:ss.SSS'
		// Named month/day formats
		| 'dddd'
		| 'ddd'
		| 'MMMM'
		| 'MMM'
		| 'MMMM YYYY'
		| 'MMM YYYY'
		// Full date with named month
		| 'DD MMMM'
		| 'DD MMM'
		| 'DD MMMM YYYY'
		| 'DD MMM YYYY'
		| 'DD MMM YYYY HH:mm'
		| 'D MMMM YYYY'
		| 'Do MMMM YYYY'
		| 'Do MMM YYYY'
		// With weekday
		| 'DD MMMM dddd'
		| 'DD MMMM YYYY dddd'
		| 'DD MMMM dddd YYYY'
		| 'DD MMMM dddd, YYYY'
		| 'DD MMM YYYY dddd'
		| 'DD MMM dddd, YYYY'
		| 'dddd, DD MMMM YYYY'
		// Year first with named month
		| 'YYYY MMM DD'
		| 'YYYY MMMM DD'
		// Timestamp formats
		| 'X'
		| 'x'
		// Allow any string for custom formats
		| string;

	/**
	 * Week start day (0 = Sunday, 1 = Monday, etc.)
	 */
	type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

	/**
	 * Global configuration options
	 */
	interface GlobalConfigOptions {
		/**
		 * BCP 47 language tag for locale
		 */
		locale?: string;
		/**
		 * IANA timezone identifier
		 */
		timezone?: string;
		/**
		 * Day of the week to start from (0 = Sunday)
		 */
		weekStartDay?: WeekStartDay;
	}

	/**
	 * Instance configuration options
	 */
	interface InstanceConfigOptions {
		/**
		 * BCP 47 language tag for locale
		 */
		locale?: string;
		/**
		 * IANA timezone identifier
		 */
		timezone?: string;
		/**
		 * Day of the week to start from (0 = Sunday)
		 */
		weekStartDay?: WeekStartDay;
	}

	/**
	 * Temporary configuration state
	 */
	interface TempConfig {
		locale?: string;
		timezone?: string;
		weekStartDay?: WeekStartDay;
		rtf?: Record<string, Intl.RelativeTimeFormat>;
	}

	/**
	 * Caching configuration options
	 */
	interface CachingOptions {
		/**
		 * Enable or disable caching
		 */
		status?: boolean;
		/**
		 * Default TTL in seconds for cached items
		 */
		defaultTtl?: number | null;
	}

	/**
	 * Cache status information
	 */
	interface CacheStatus {
		status: boolean;
		killerIsFinished: boolean;
		lastKiller: number;
		nextKiller: number;
		criticalError: number;
		defaultTtl: number;
		totalHits: number;
		cacheSize: number;
		maxCacheSize: number;
		total: number;
		size: string;
	}

	/**
	 * Duration result object
	 */
	interface DurationResult {
		years: number;
		months: number;
		weeks: number;
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
		milliseconds: number;
		$kk_date: { milliseconds: number };
		asMilliseconds(): number;
		asSeconds(): number;
		asMinutes(): number;
		asHours(): number;
		asDays(): number;
		asWeeks(): number;
		asMonths(): number;
		asYears(): number;
	}

	/**
	 * Duration object for add() method
	 */
	interface DurationObject {
		$kk_date: { milliseconds: number };
	}

	/**
	 * Timezone information
	 */
	interface TimezoneInfo {
		timezone: string;
		offset: number;
		isDST: boolean;
		abbreviation: string;
		standardOffset: number;
		daylightOffset: number;
	}

	/**
	 * Configure global settings
	 * @param options - Configuration options
	 */
	function config(options: GlobalConfigOptions): boolean;

	/**
	 * Creates a duration object
	 * @param time - Time value
	 * @param type - Time unit (includes 'weeks')
	 */
	function duration(time: number, type: TimeUnit | 'weeks'): DurationResult;

	/**
	 * Configure caching
	 * @param options - Caching options
	 */
	function caching(options?: CachingOptions): boolean;

	/**
	 * Get cache status
	 */
	function caching_status(): CacheStatus;

	/**
	 * Flush all cached data
	 */
	function caching_flush(): boolean;

	/**
	 * Validate a date string against a format
	 * @param date_string - Date string to validate
	 * @param template - Format template
	 */
	function isValid(date_string: string, template: FormatType): boolean;

	/**
	 * Get timezone information
	 * @param timezone - IANA timezone identifier
	 * @param date - Date for which to get info
	 */
	function getTimezoneInfo(timezone: string, date?: Date): TimezoneInfo;

	/**
	 * Convert date between timezones
	 * @param date - Date to convert
	 * @param targetTimezone - Target timezone
	 * @param sourceTimezone - Source timezone (optional)
	 */
	function convertToTimezone(date: Date, targetTimezone: string, sourceTimezone?: string): Date;

	/**
	 * Get list of available timezones
	 */
	function getAvailableTimezones(): string[];

	/**
	 * Check if date is in DST for timezone
	 * @param timezone - IANA timezone identifier
	 * @param date - Date to check
	 */
	function isDST(timezone: string, date?: Date): boolean;

	/**
	 * Get timezone abbreviation
	 * @param timezone - IANA timezone identifier
	 * @param date - Date for abbreviation
	 */
	function getTimezoneAbbreviation(timezone: string, date?: Date): string;

	/**
	 * Check if timezone is valid
	 * @param timezone - IANA timezone identifier
	 * @throws Error if timezone is invalid
	 */
	function checkTimezone(timezone: string): boolean;

	/**
	 * Get timezone offset in milliseconds
	 * @param timezone - IANA timezone identifier
	 * @param date - Date for which to get offset
	 */
	function getTimezoneOffset(timezone: string, date?: Date): number;

	/**
	 * Get current global timezone
	 */
	function getTimezone(): string;

	/**
	 * Set global timezone
	 * @param timezone - IANA timezone identifier
	 */
	function setTimezone(timezone: string): void;

	/**
	 * Get user timezone
	 */
	function getUserTimezone(): string;

	/**
	 * Set user timezone
	 * @param timezone - IANA timezone identifier
	 */
	function setUserTimezone(timezone: string): void;
}
