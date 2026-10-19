# Changelog

## Unreleased

### Fixed

- **`diff_range()` with `days`, `weeks`, `months` or `years` lists every step whose date is on or
  before the end's date** in the instance's timezone; the time of day no longer matters. A start
  time later than the end time dropped the last date (`2024-01-01 10:00 → 2024-01-03 09:00` listed
  two dates; the same for weeks, months and years), and so did a range starting on a day whose
  midnight is skipped by DST, which begins at 01:00 (America/Santiago `2024-09-08`,
  America/Sao_Paulo `2018-11-04`, Asia/Beirut `2024-03-31`). A month-end step that would land after
  the end's date is still left out. `hours`, `minutes` and `seconds` still step up to the end instant.
- **`diff_range()` lists every date once**: after a date the timezone skipped entirely, 5.1.0
  repeated the next date (Pacific/Apia has no `2011-12-30` and `2011-12-31` appeared twice — a
  regression from 5.0.x; also Pacific/Fakaofo, Kiritimati, Enderbury and Kwajalein). A skipped date
  is not listed by `days`; a `weeks`/`months`/`years` step on it keeps `add()`'s next date, so the
  period is still listed. When the start's time of day falls in a DST gap that `add()` would carry
  into the next date (America/Nuuk skips 23:00–24:00 on 2024-03-30; Greenland every March, and
  older transitions in a dozen zones), that entry moves back by the gap instead (23:30 → 22:30), so
  it keeps its date and the next date is not listed twice.

### Documentation

- `diff(…, 'days' | 'weeks')` is unchanged: it counts whole days between the two wall-clock times,
  like moment — the docs wrongly called this "calendar days". From the 01:00 start of a day without
  a midnight to the next midnight is 23 hours, so `0` days (Luxon and Temporal agree there). For
  date-only values `Math.round(a.diff(b, 'days', true))` is the calendar-day difference in every
  timezone; `diff_range()` lists the dates.
- Timezone guide: runtimes ship different tzdata versions (Node 22: 2025c, Node 24+: 2026b), and a
  V8 issue in Node 24 and later can give the wrong local offset inside DST periods shorter than
  about two weeks; kk-date inherits it only when the timezone is the system timezone.

### Tests

- 1,426 → 1,454 tests. Expected lists come from Temporal and date-fns `eachDayOfInterval`; a Luxon
  reference scan checks random ranges in seven zones (DST gaps and overlaps, midnight transitions,
  the 23:00 gap in Nuuk, the skipped Apia day), and the new tests fail on 5.1.0. Offline, ~217,000
  random ranges around the real transitions of all 418 IANA zones matched Temporal with the global,
  instance and system timezone; the only differences came from the runtime (tzdata version, the V8
  issue above).

## v5.1.0

Correctness release from a full behavior review: every fix below was reproduced first and is
locked by tests whose expected values come from independent oracles (moment-timezone, Luxon,
`Intl`), and which fail on the previous release. 657 → 1,426 tests; the suite passes with the
system timezone set to each of 28 zones (DST zones east and west of UTC, half-hour and 45-minute
offsets, midnight transitions, UTC+14).

### ⚠️ Read before upgrading from 5.0.x

All of these are fixes, but code that relied on (or worked around) the old results sees a
different value — or an error where 5.0.1 silently returned something:

- **Now throws:** text with trailing junk (`'1st Jan 2024 foo'`, `'Monday, 15 January 2024 extra'`
  — 5.0.1 kept the date and dropped the rest); `setTimezone(undefined)` / `tz(undefined)`.
- **The constructor's format argument is honored for every template:**
  `new kk_date('04/01/2019', 'DD/MM/YYYY')` is January 4 (5.0.1: April 1).
- **Strings with their own offset or zone** are no longer shifted by the global timezone.
- **Calendar arithmetic around DST:** `add(n, 'days')` keeps the wall-clock time — drop any
  workaround for the old behavior; `diff(…, 'days')` counts calendar days; `isBetween(…, unit)`
  compares calendar periods; `add(1.5, 'hours')` adds 90 minutes, `add(1.5, 'days')` 2 days.
- **Dates without a year or time zone:** `new kk_date('2024')` is midnight in the global timezone
  (5.0.1: UTC midnight); a year-less text date with a time is in the current year (5.0.1: 2001).
- **Other outputs:** `toLocaleString()` & co. use the configured locale and timezone;
  `getAvailableTimezones()` lists every zone the runtime supports; strict `isValid(…, true)`
  follows moment strict and rejects more; `format('YYYY')` writes years below 1000 with four digits.

### 🔒 Security

- **ReDoS in two text templates.** `'dddd, DD MMMM YYYY'` and `'DD MMMM dddd, YYYY'` used
  `([1-9]|[12][0-9]|3[01])+`; a 54-character input such as `'Monday, ' + '1'.repeat(44) + ' x'`
  blocked the event loop for ~20 s in `new kk_date(input)` and `kk_date.isValid()`. The day group
  is single now; all predefined patterns were re-audited with adversarial inputs (linear time),
  and the dynamic `isValid` templates reject inputs longer than 256 characters up front.

### 🐛 Fixed — DST and timezones

- **`add` / `startOf` / `endOf` / `set` near DST transitions.** The new offset was looked up at the
  wall-clock-as-UTC instant, so in a window of |UTC offset| hours around each transition results
  were off by an hour — e.g. `add(1, 'days')` from midnight onto a transition day returned the
  previous date in America/Santiago, Sydney, Auckland, Cairo, Beirut, Jerusalem, Chisinau, Nuuk
  (23 zones in 2024-2026), `startOf('days')` landed on the previous day, `add(1, 'minutes')` at
  04:30 on New York's spring-forward day returned 05:31, and `set('months', 6)` moved 10:00 EST to
  11:00 EDT. Wall-clock results are now resolved at their own instant: a time a DST gap skips moves
  forward by the gap (V8 `Date`, Luxon); a time that occurs twice (DST overlap) stays on the side
  of the change the original instant was on when that reading exists — `add(-1, 'days')` from
  2024-11-04 01:30 EST in New York gives 2024-11-03 01:30 EST, `set('minutes', 0)` within the
  second 01:xx hour keeps EST (moment-timezone and Luxon agree) — and a parsed repeated time is the
  earlier instant (moment, Luxon); `endOf` is the instant before the next period starts.
- **Global-timezone parsing near DST transitions.** `new kk_date('2024-03-10 03:30:00')` with a UTC
  system and `setTimezone('America/New_York')` gave 04:30; up to 24 wall-clock hours a year were
  misread (Auckland). Also fixed when the *system* zone skips the time (Berlin system, Istanbul
  global, `'2024-03-31 02:30'`).
- **Strings with an explicit offset or zone are absolute instants.** `'2024-01-15T10:00:00+03:00'`,
  `'... 10:30:45+03'`, `'... 07:30:45 UTC'`, RFC 2822 / HTTP dates and `Date#toString()` output
  were shifted by the global timezone (a UTC container configured for Istanbul could not read its
  own `format()` output back: −3 h). They are never reinterpreted now; `detected_format` is
  `'ISO8601'` (ISO shape) or `'RFC2822'` (other). Whether a string carries a zone is decided the
  way the engine's own parser decides it (a zone name anywhere after a number, a sign after a time:
  `'Jan 15, 2024 10:00:00 PM UTC'`, `'15 Jan 2024 22:00 +3'`, `'… GMT +0300'`, trailing spaces),
  checked against the engine on ~400,000 generated strings.
- **Naive strings the engine parses keep their wall clock.** `'03/10/2024 02:30'` or
  `'March 10, 2024 02:30:00'` on a New York system with `setTimezone('Europe/Istanbul')` became
  03:30 (the system zone skips 02:30). ES5 date-only forms (`'2024'`, `'2200-07-01'`,
  `'+002024-01-15'`), which the engine reads as UTC midnight, are now dates like every other
  date-only input: `new kk_date('2024')` showed 2023-12-31 16:00 on a Los Angeles system (moment:
  2024-01-01 00:00).
- **"Today" and "this year" use the global timezone.** At 22:30 UTC in a UTC container configured
  for Istanbul, `new kk_date('14:30')` resolved onto the UTC date (yesterday in Istanbul).
- **Hour periods never straddle an offset change** (`startOf/endOf('hours')` in zones with 30-minute
  DST shifts or 45-minute offsets, and transitions at :01): `startOf ≤ instant ≤ endOf` always holds.
- **Historical local mean time** (offsets with seconds, e.g. Istanbul before 1880 `+01:55:52`):
  arithmetic and display used offsets truncated to minutes and disagreed by up to 59 s.
- **`isDST()`** follows moment's definition (same wall-clock day/time in January and June), fixing
  years where a zone changed its base offset mid-year (e.g. Africa/Sao_Tome 2018).
- **Hermes fallback:** an engine reporting midnight as hour `24` (h24 cycle) produced a +24 h offset.

### 🐛 Fixed — parsing

- **The constructor's format argument is applied for every predefined template.** It was honored
  only for `YYYY-MM-DD`, `YYYY-DD-MM` and `mm:ss`; the others were shape-checked and then
  auto-detected, so `new kk_date('04/01/2019', 'DD/MM/YYYY')` returned **April 1**, `'17/05/1986'`
  threw, `'YYYY-MM-DD HH'` / `'MMMM'` / `'ddd'` always threw and `('05', 'MM')` gave 2001-05-01.
  Missing fields follow moment (no date field → today; a bare weekday → that day of the current
  week). Results for all 56 templates were cross-checked against moment.
- **Text templates are anchored.** They used to claim the date prefix of longer inputs and drop the
  rest: HTTP dates (`toUTCString()`), `'Monday, 15 January 2024 14:30'` and
  `'15th May 2024 08:00:00'` silently became midnight (the time is kept now), and junk such as
  `'1st Jan 2024 foo'` was accepted (it throws now — fail-fast).
- **Text dates in other languages followed by a time** (`'Pazartesi, 15 Ocak 2024 14:30'`,
  `'1er janvier 2024 10:00'`) keep the time; they used to become the date at midnight. A year-less
  text date with a time is in the current year in every language, like the same text without the
  time: `'15 March 14:30'` and `'15 Mart 14:30'` were 2001 (the engine parser's default year).
- **A 2-digit year in a forced `YYYY` template keeps the template's field order** (moment):
  `new kk_date('12-11-10', 'DD-MM-YYYY')` is 2010-11-12 (00-68 -> 20xx, 69-99 -> 19xx); it was left
  to the engine, which read it month first (December 11).
- **Years 0-99 are not moved to 1900-1999:** `'1st Jan 0050'` was the year 1950. `format('YYYY')`
  writes years below 1000 with four digits (`'0050'`, like moment and dayjs; it wrote `'50'`, which
  did not parse back) and `YY` with two.
- **Zero-padded days in text templates:** `format('DD MMMM YYYY')` yields `'05 January 2024'`, which
  `isValid(…, 'DD MMMM YYYY')` and the forced constructor rejected.
- **New auto-detected shapes** (previously threw): `YYYY-MM-DD HH`, `DD-MM-YYYY HH`, `YYYY.MM.DD HH`,
  `DD MMMM YYYY dddd`, `DD MMMM dddd YYYY` (the weekday must be a real weekday name).
- **Fractional numeric timestamps** use the same seconds/milliseconds rule as integers
  (`1700000000.5` → 1700000000500 ms; `1.5` used to be string-parsed as the year 2001).
- **Month names in the configured locale's language win:** Croatian `'listopad'` is October with
  `config({ locale: 'hr' })` (Polish/Czech `listopad` is November).

### 🐛 Fixed — comparisons and arithmetic

- **`isBetween(a, b, unit)`** compares calendar periods in the instance's timezone (moment `'[]'`);
  it used 31-day/365-day buckets counted from 1970 (Feb 29 was "between" March 1 and 31 by
  months) and UTC days. An invalid instance now throws like the other comparisons.
- **`diff(…, 'days')`** counts calendar days (wall-clock difference, moment): a 23- or 25-hour DST
  day is one day. `diff(…, 'weeks')` is supported.
- **`diff(…, 'months' | 'years')`** applies moment's anchor swap (Jan 30 → Feb 29 next year is 13
  months in both directions) and reads the calendar in the instance's timezone. Fractional values
  equal `-moment(a).diff(b, unit, true)`.
- **`diff_range('months' | 'years')`** steps on the calendar: 2024-01-01 → 2024-06-01 used to skip
  February and drop June; `'days'` keeps every date at midnight across DST and includes the last one.
- **`add()` amounts:** seconds/minutes/hours are absolute durations with exact fractions
  (`add(1.5, 'hours')` added one hour); days/weeks/months/years round half away from zero like
  moment (`add(0.5, 'days')` added nothing).
- **`set('months' | 'years')` clamps the day** like moment (Jan 31 → set February → Feb 29, was Mar 2).
- **`fromNow()`** rounds every unit from the whole duration (90 s is "2 minutes", 36 h "2 days"),
  symmetrically for past and future, with moment's month measure.
- **`valueOfLocal()`** no longer depends on when it is called (it used today's global offset).
- **`toLocaleDateString/String/TimeString`** use the instance or (once configured) global locale and
  the instance/global timezone, as documented; unconfigured they still use the runtime default.

### 🐛 Fixed — caching and state

- **Parse cache:** forced templates and auto-detection shared the raw text as key
  (`'2024-05-03'` with `YYYY-DD-MM` poisoned later auto-detected parses), a cached text skipped
  forced-format validation, today-relative inputs (`'09:00'`, `'15 March'`) returned yesterday's /
  last year's date after midnight / New Year, and clones were looked up via `toString()`. A cached
  parse now records what it depended on and is reused only for the same kind of parse (the same
  forced template, or auto-detection — a text can never stand in for another input's key), on the
  same date (in the global timezone) and, when it resolved month/weekday names, under the same
  locale language; bare times and weekday names are not cached (parsing them is cheaper than a
  checked lookup).
- **Enabling caching no longer keeps the process alive** (the cleaner interval is `unref()`'d).
- **nope-redis:** expired entries were served until the 5-second cleaner ran; `caching_flush()` kept
  the key counter and permanently shrank the capacity; prototype keys counted as hits;
  `caching({ defaultTtl })` before enabling caching was ignored.
- **Global `config()` is atomic:** a call that throws (e.g. valid locale + invalid timezone) used to
  apply the locale anyway and leave stale cached formats; instance `config()` likewise.
- **`setTimezone(undefined)` / `tz(undefined)` throw** `Invalid timezone` (Intl silently accepted it).
- **Bounded caches:** Intl formatter caches keyed by timezone/locale strings, and failing format
  templates, could grow without limit.

### ⚠️ Changed

- `getAvailableTimezones()` returns every zone the engine supports (`Intl.supportedValuesOf`, plus
  `UTC`) instead of 14 hard-coded ones, as documented.
- Strict `isValid(…, true)` follows moment strict more closely: month/weekday names must have the
  token's form (`MMMM` long, `MMM` short, `dddd` long, `ddd` short, `dd` two letters — any supported
  language), a weekday must match the date, `DD` needs two digits and `D`/`M`/`H`/`h`/`m`/`s` take no
  leading zero, `Do` needs its suffix, week numbers must exist in their week-year, offsets are
  limited to ±14:00, and a bare `HH` of `24` is accepted. In both modes the meridiem tokens `A`/`a`
  accept moment's spellings — either case, `A`/`P`, `a.m.`/`p.m.` — where they used to accept only
  `AM`/`PM` for `A` and `am`/`pm` for `a` (strict stays a subset of the default mode). Otherwise the
  default (non-strict) mode is unchanged.
- Month/weekday name tables are built lazily: `require('kk-date')` takes ~19 ms instead of ~55 ms
  (Node.js 22, our measurement). English names and names in the configured locale's language need
  only their own tables; the tables of all 90 languages are built on the first other name (~37 ms,
  once).
- Packaging: `files` whitelist (the package no longer ships tests, the 526 KB fixture, docs,
  benchmarks or local editor settings), `jest` is a devDependency (`npx jest` no longer downloads
  the latest Jest), `npm run lint:fix`.
- CI: the timezone matrix also runs in Europe/Berlin, America/Santiago, Asia/Beirut (DST changes at
  midnight) and Australia/Lord_Howe (30-minute DST); the Jest coverage thresholds are raised to just
  below the measured coverage (statements/lines 88 %, branches 85 %, functions 95 %) and enforced
  by the Node.js 26 unit-test job; PR checks also run on reopened pull requests, with read-only
  permissions, and a newer push cancels the superseded run. Publishing runs the tests on the commit
  being released first, pins npm to 11 and never runs twice at once; benchmark runs on `dev` queue
  instead of cancelling one another.

## v5.0.1

Bug-fix release driven by a full code audit: every fix below was reproduced first,
locked with a failing test, then fixed (4 new test files, +71 tests, coverage
84.7% → 87.4% statements).

### 🐛 Fixed

- **`add(duration)` works as documented.** A boolean logic error made the documented
  `add(kk_date.duration(...))` form throw `amount is wrong` unconditionally; the duration
  branch was unreachable dead code.
- **Southern-hemisphere DST detection.** `getTimezoneInfo()`/`isDST()` assumed January is
  standard time and July is daylight time. For zones like `Australia/Sydney` this inverted
  `isDST` and swapped `standardOffset`/`daylightOffset`. Standard time is now derived as the
  smaller of the January/July offsets, which is hemisphere-independent (verified incl. the
  30-minute Lord Howe shift).
- **`startOf('weeks')`/`endOf('weeks')` honor an instance `weekStartDay: 0` override** when the
  global week start is non-zero (`||` → `??`, matching how the week format tokens resolve it).
- **nope-redis cache accounting.** Expired keys removed by the periodic cleaner stayed in the
  LRU index, wasting eviction slots and double-decrementing the key counter (which could stop
  eviction entirely); overwriting an existing key inflated the counter, eventually purging the
  cache. Both counters are now exact.
- **Timezone offset cache is bounded.** The 7-day TTL check was dead code (the cache key embeds
  the exact millisecond) and the cache had no size cap, growing without limit in long-running
  processes. It is now bounded at 10,000 entries like the other caches.
- **`isBetween` error message** now lists `weeks`, which was always a valid unit.
- **`add(0, type)` validates the type** instead of silently succeeding on the zero fast path.
- **Comparison methods are consistent on invalid instances**: `isAfter`/`isSame`/`isSameOrAfter`
  now throw `Invalid Date` like `isBefore`/`isSameOrBefore` did.
- Removed dead code: `target_timezone_cache`, `format_types_cache`, `cache_ttl` (all exported
  but never read) and a latent shadowed-variable bug in the cache size reporter.
- **Benchmark/report percentages corrected.** The cache hit ratio now uses real hit/miss counts —
  nope-redis stats gained a `totalMisses` counter (previously the ratio divided by the entry count,
  which is not the miss count); the overall vs-Luxon figure now averages kk-date over the same
  test subset Luxon runs (21 of 58 scenarios have no Luxon case, so the old comparison mixed
  test sets); an operator-precedence bug in the docs generator quantized the "Day.js takes ≈X%
  more time" figure to multiples of 100 (`round(x - 1) * 100` → `round((x - 1) * 100)`); and every
  published figure (benchmark console output, README/PERFORMANCE tables and bullets) now uses one
  unambiguous convention: **"X% less/more time (Nx faster/slower)"** — the bounded time percentage
  paired with the speed multiple — replacing the previous mix of two different "% faster" formulas.

### ⚠️ Changed (outputs previously wrong or inconsistent)

- **`diff('months')` / `diff('years')` are calendar-aware** (moment-compatible anchor
  arithmetic; verified against moment on 6,000 date pairs with zero mismatches). Previously they
  divided elapsed time by fixed averages, so a full 365-day year reported `diff('years') === 0`
  and `Jan 1 → Mar 1` reported 1 month. Code relying on the old average-based numbers will see
  different (correct) results. The sign convention `a.diff(b) = b − a` is unchanged;
  sub-month units are unchanged; `diff_range()` keeps its fixed-average stepping; `duration()`
  keeps its documented 31-day/365-day approximations (now called out in the docs).
- **`add(n, 'years')` clamps at month end**: `2024-02-29` + 1 year is now `2025-02-28`
  (was `2025-03-01`), making it consistent with `add(12, 'months')` and moment/dayjs.
- **Numeric arguments to `isSame`/`isBefore`/`isAfter`/`isSameOrBefore`/`isSameOrAfter`** now
  use the constructor's seconds-vs-milliseconds rule (≤10 digits = Unix seconds). Previously
  `new kk_date(X).isSame(X)` was `false` for every 10-digit Unix timestamp.
- **Instance `config({ timezone })` fails fast** with `Invalid timezone: ...` on invalid IANA
  names (matching `tz()` and the global config) instead of failing later inside `format()`.

### 📝 Docs

- `add()` mutation semantics corrected (mutates in place, returns `this` — the docs claimed a
  new instance was created); duration-object usage documented.
- `diff()` third parameter documented under its real name (`is_decimal`, was `asFloat`) and the
  new calendar-aware unit semantics explained.
- `duration()` examples fixed (the previous no-argument example threw) and the integer/positive
  input contract documented; `add()` TypeScript signature gains `'weeks'`.

## v5.0.0 — 2026-07-08

kk-date 5.0 rebuilds the formatting and validation engines around a compile-once dynamic
template compiler, completes the moment/dayjs display-token vocabulary, and rewrites the
constructor's auto-detection as shape-based dispatch — while keeping every 4.x output
**byte-for-byte identical** (locked by a committed parity fixture generated from the 4.x
formatter before the rewrite).

### 💥 Breaking Changes

- **`format_c()` was removed.** Dynamic templates cover every use case in a single `format()`
  call. Join the old arguments into one template; bracket separators that could read as tokens:
  ```js
  // before: date.format_c(' ', 'DD', 'MMMM', 'YYYY')
  date.format('DD MMMM YYYY');
  // before: date.format_c('T', 'YYYY-MM-DD', 'HH:mm:ss')
  date.format('YYYY-MM-DDTHH:mm:ss');
  ```
  See the migration guide in `docs/FORMATTING-GUIDE.md`.
- **Unbracketed letters in templates are now token-interpreted** (moment/dayjs semantics).
  With the full token vocabulary nearly every latin letter is a token, so literal words must
  be `[bracketed]`: `'[saat] HH:mm'`, `'[Today is] dddd'`. Letter-only strings such as
  `'hello'` no longer throw — they format (`h` and `e` are tokens). Only a template with no
  recognizable token still throws `Error: template is not right`.

### ✨ New Features

- **Dynamic format templates.** `format()` compiles any combination of supported tokens, in
  any order, with any separators (`'YYYYMM'`, `'HHmm'`, `'YYYY/MM ss'`, `'[Created:] DD MMMM'`).
  Templates are compiled once and cached, so custom combinations cost the same as the
  predefined ones.
- **Full moment/dayjs display-token vocabulary** (era tokens and localized `L`/`LT` macros
  excluded):
  - Years `YYYY YY`, week-years `gggg gg` (locale week) and `GGGG GG` (ISO)
  - Months `MM M Mo MMMM MMM`, quarters `Q Qo`
  - Days `DD D Do`, day-of-year `DDD DDDo DDDD`
  - Weekdays `dddd ddd dd d do e E`, week-of-year `w wo ww` (respects `weekStartDay`) and
    `W Wo WW` (ISO)
  - Hours `HH H hh h k kk` (`k`/`kk`: 1–24, midnight renders `24`), minutes `mm m`,
    seconds `ss s`, fractional seconds `S` … `SSSSSSSSS`
  - Meridiem `A a`, UTC offset `Z ZZ`, zone names `z zz zzz` (Intl/CLDR-derived),
    in-template unix `X x`
  - `[bracketed]` literal text, dayjs/moment style
- **Universal `isValid`.** The static `kk_date.isValid(value, template)` now accepts *any*
  display-token template (compiled and memoized on first use), not just the predefined list.
  `mm:ss` was added as a predefined template (usable in the forced-format constructor too,
  resolving onto today's date).
- **Strict validation mode** — `kk_date.isValid(value, template, true)` gives
  `moment(value, format, true).isValid()` parity: real calendar days with leap years
  (`2021-02-30` → false), wall-clock hours with the exact `24:00[:00]` allowance, 4-digit
  years (1700–2199) and no `:ss` tail on `HH:mm`. **Default mode is unchanged** — verified
  bit-for-bit against the 4.x regex semantics (day-overflow hours up to 29 still validate,
  preserving the GTFS-style overflow-time feature).

### ⚡ Performance

- **Formatting: ~6–13× faster.** The ~560-line fixed switch was replaced by a compiled-parts
  interpreter, and the per-call string cache key by a two-level cache with a packed numeric
  sub-key (`timestamp*1024 + config-signature`). A repeat `format()` is a single `Map` lookup
  (~24M ops/s; ~57M ops/s for a repeated single instance — measured on Apple Silicon, Node 22).
- **Constructor: up to ~4–5× faster.** Auto-detection dispatches by input shape
  (length + separator char codes) to per-family charCode parsers instead of walking a
  sequential regex ladder; field extraction avoids `split()` allocations. Examples (old → new):
  `DD.MM.YYYY` 3.4M → 9.0M ops/s, time-only `HH:mm[:ss[.SSS]]` ~2M → ~9M ops/s,
  `YYYY-MM-DD HH:mm:ss` ~1.4M → ~5.9M ops/s.
- **Validation: faster on every template.** Predefined templates are validated by charCode
  validators that replicate the legacy regex semantics exactly (+40–125% in validation
  microbenchmarks).
- **Timezone math:** system-timezone offsets use the native `Date` fast path; `Intl` is only
  consulted for non-system zones. Derived format fields (week-of-year, day-of-year, weekday
  numbers, offsets) are lazy pure-integer math — no `Intl` on the numeric path.
- **Honest benchmarks:** `benchmark.js` now loads dayjs's `customParseFormat` plugin so
  `dayjs(str, format)` actually parses the format string (previously it silently fell back to
  native `Date` parsing, producing Invalid Date in ~0 time). With that corrected, kk-date is
  the fastest library in **every** benchmark scenario vs Moment.js, Day.js and Luxon — see the
  CI-refreshed tables in `README.md` and `docs/PERFORMANCE.md`.

### 🐛 Fixes

- `kk_date.setTimezone()` now invalidates the formatter's cached config signature — previously
  an already-formatted instance could keep returning results rendered in the old global
  timezone.
- Constructor cache hits now restore `detected_format` — cached instances no longer lose the
  input classification that drives timezone reinterpretation and formatter cache lanes.
- `'DD MMMM dddd, YYYY'` inputs were mislabeled with a copy-pasted `detected_format`
  (`'YYYY.MM.DD HH:mm'`), silently sharing the wrong formatter cache lane.
- `weekStartDay` now participates in the formatter cache signature, so week-token output can
  never go stale after a global or per-instance week-start change.

### 🔒 Compatibility Guarantees

- **Byte-parity fixture:** `test/fixtures/format-parity.json` (2,376 entries generated from
  the pre-rewrite 4.x formatter, later extended append-only for the new tokens) is replayed in
  CI — every 4.x-era template renders byte-for-byte identically.
- **Parse-behavior lock:** `test/parse-behavior-lock.test.js` pins auto-detection across all
  input families, including overflow times (`'24:00:00'`, `'26:30:00'` still roll into the
  next day).
- Default `isValid` semantics, `diff()` sign, `.tz()` mutate-in-place behavior, whole-template
  `'X'`/`'x'` number returns, and the trailing ` AM`/` PM` on bare `h`/`hh` templates are all
  unchanged.
- Test suite grew from 522 to **585 tests** (24 suites).

### 📖 Documentation

- New supported-token table and template rules in `docs/FORMATTING-GUIDE.md`, plus a
  `format_c()` migration section; `isValid` strict-mode docs in `docs/API-REFERENCE.md`;
  README breaking-changes section; benchmark tables are refreshed automatically by CI with
  number-driven claims.

### ⚙️ CI / Internal

- GitHub Actions moved off deprecated Node 20 runtimes (`checkout@v5`, `setup-node@v5`,
  `upload-artifact@v6`, `github-push-action@v1.3.0`).
- The benchmark-docs workflow now runs on pushes to `dev` only (no PR runs), skips entirely
  when a push changes no `.js` file, and supports manual dispatch with an opt-in
  `commit_back`.
