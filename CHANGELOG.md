# Changelog

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
