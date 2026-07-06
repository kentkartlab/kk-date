const { describe, test, expect } = require('@jest/globals');
const kk_date = require('../index');
const fixture = require('./fixtures/format-parity.json');

// Byte-parity contract for the formatter: the fixture was generated from the
// pre-refactor switch-case implementation via scripts/generate-format-fixtures.js.
// Every entry must keep producing the exact same output. Do NOT regenerate the
// fixture in the same change that modifies formatter behavior.
describe('format parity fixture', () => {
	const blocks = new Map();
	for (const entry of fixture) {
		const key = `${entry.timezone} / ${entry.locale}`;
		if (!blocks.has(key)) {
			blocks.set(key, []);
		}
		blocks.get(key).push(entry);
	}

	for (const [name, entries] of blocks) {
		test(`${name} (${entries.length} entries)`, () => {
			const { timezone, locale } = entries[0];
			kk_date.config({ timezone, locale });
			const failures = [];
			for (const entry of entries) {
				const got = new kk_date(entry.input.value).format(entry.template);
				if (got !== entry.expected) {
					failures.push({ template: entry.template, input: entry.input.value, expected: entry.expected, got });
				}
			}
			expect(failures).toEqual([]);
		});
	}
});
