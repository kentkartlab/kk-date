/**
 * Generates test/fixtures/format-parity.json by running the CURRENT formatter
 * over every template in format_types (plus null, 'x', 'X') for a matrix of
 * edge-case inputs and timezone/locale configs.
 *
 * Run this ONLY on the trusted (pre-refactor) implementation:
 *   node scripts/generate-format-fixtures.js
 *
 * The committed fixture is the byte-parity contract for formatter refactors:
 * test/format-parity.test.js replays it and asserts strict equality.
 * Determinism does not depend on the machine timezone — every block sets an
 * explicit kk_date.config({ timezone }) exactly like the existing test suite.
 */
const fs = require('node:fs');
const path = require('node:path');
const kk_date = require('../index');
const { format_types } = require('../constants');

const NAME_TOKEN = /MMMM|MMM|dddd|ddd/;

const all_templates = [...Object.keys(format_types), null, 'x', 'X'];
const name_templates = Object.keys(format_types).filter((t) => NAME_TOKEN.test(t));

// kind: 'string' inputs are naive/ISO date strings, 'number' inputs are unix timestamps.
const inputs = [
	{ kind: 'string', value: '2024-01-05 07:08:09' }, // single-digit day/month/hour
	{ kind: 'string', value: '2024-08-19 23:50:59' },
	{ kind: 'string', value: '2024-12-31 00:00:00' }, // midnight
	{ kind: 'string', value: '2024-02-29 12:00:00' }, // leap day + noon
	{ kind: 'string', value: '2023-11-01 13:05:00' }, // PM
	{ kind: 'string', value: '2025-06-01 04:00:00' },
	{ kind: 'string', value: '2024-03-07T09:04:05.007Z' }, // ISO8601, ms < 10
	{ kind: 'string', value: '2024-03-07T09:04:05.045Z' }, // ISO8601, ms < 100
	{ kind: 'string', value: '2024-03-07T21:04:05.345Z' }, // ISO8601, ms >= 100, PM
	{ kind: 'number', value: 1724111459 }, // unix seconds ('Xx' branch)
	{ kind: 'number', value: 1724111459345 }, // unix milliseconds ('Xx' branch)
];

const blocks = [
	{ timezone: 'UTC', locale: 'en', templates: all_templates },
	{ timezone: 'Europe/Istanbul', locale: 'en', templates: all_templates },
	{ timezone: 'America/New_York', locale: 'en', templates: all_templates },
	{ timezone: 'UTC', locale: 'tr', templates: name_templates },
	{ timezone: 'UTC', locale: 'de', templates: name_templates },
];

// v5 display tokens, run as a second pass so regenerating stays append-only
// against the legacy matrix above. z/zz/zzz are deliberately absent: their
// output is ICU-data-dependent and would make the fixture brittle across
// Node builds (unit tests cover them with stable zones instead).
const new_token_templates = [
	'YY-M-D',
	'Q Qo Mo do wo Wo DDDo',
	'DDD DDDD [day of year]',
	'dd ddd dddd',
	'e E d',
	'[w]w [of] gggg gg',
	'GGGG-[W]WW-E',
	'ww/gggg',
	'k kk H m s',
	'h:mm A',
	'S SS SSS SSSS SSSSSS SSSSSSSSS',
	'YYYY-MM-DDTHH:mm:ssZ',
	'Z ZZ',
	'X [and] x',
];
const new_token_name_templates = ['dd ddd dddd'];

const new_token_blocks = [
	{ timezone: 'UTC', locale: 'en', templates: new_token_templates },
	{ timezone: 'Europe/Istanbul', locale: 'en', templates: new_token_templates },
	{ timezone: 'America/New_York', locale: 'en', templates: new_token_templates },
	{ timezone: 'UTC', locale: 'tr', templates: new_token_name_templates },
	{ timezone: 'UTC', locale: 'de', templates: new_token_name_templates },
];

const entries = [];
for (const block of blocks) {
	kk_date.config({ timezone: block.timezone, locale: block.locale });
	for (const input of inputs) {
		for (const template of block.templates) {
			const expected = new kk_date(input.value).format(template);
			entries.push({ timezone: block.timezone, locale: block.locale, input, template, expected });
		}
	}
}
for (const block of new_token_blocks) {
	kk_date.config({ timezone: block.timezone, locale: block.locale, weekStartDay: 0 });
	for (const input of inputs) {
		for (const template of block.templates) {
			const expected = new kk_date(input.value).format(template);
			entries.push({ timezone: block.timezone, locale: block.locale, input, template, expected });
		}
	}
}

const out_path = path.join(__dirname, '..', 'test', 'fixtures', 'format-parity.json');
fs.mkdirSync(path.dirname(out_path), { recursive: true });
fs.writeFileSync(out_path, `${JSON.stringify(entries, null, '\t')}\n`);
console.log(`Wrote ${entries.length} entries to ${out_path}`);
