#!/usr/bin/env node
/**
 * Refreshes the auto-generated performance tables in README.md and docs/PERFORMANCE.md
 * from real benchmark results. Only the regions between HTML markers
 *   <!-- BENCH:id --> ... <!-- /BENCH:id -->
 * are rewritten; all surrounding prose/qualifiers are left untouched.
 *
 * Usage:
 *   node scripts/update-benchmark-docs.js <comprehensive.json> <sequential.json>
 *     - JSON files produced by `node benchmark.js --json` / `node benchmark2.js --json`
 *       (order-independent; detected by each file's `type` field).
 *   node scripts/update-benchmark-docs.js
 *     - with no args, runs both benchmarks itself (slow).
 *
 * Run by the "Update Benchmark Docs" workflow on PRs to `dev`.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const PERF = path.join(ROOT, 'docs', 'PERFORMANCE.md');

// Static (non-benchmark) columns for the memory table.
const BUNDLE = { 'kk-date': '15 KB', 'Moment.js': '297 KB', 'Day.js': '18.5 KB', Luxon: '71 KB' };
const DST = { 'kk-date': 'Built-in', 'Moment.js': 'Plugin required', 'Day.js': 'Plugin required', Luxon: 'Built-in' };

const SEQ_ORDER = ['Date Creation & Formatting', 'Time Operations', 'Timezone Conversions', 'Complex Operations'];
const LIBS = ['kk-date', 'Moment', 'Day.js', 'Luxon'];
const COMPETS = ['Moment', 'Day.js', 'Luxon'];

const round = (v) => Math.round(v);
const secs = (ms) => `${(ms / 1000).toFixed(2)}s`;
const ops = (n) => n.toLocaleString('en-US');

function loadInputs() {
	const args = process.argv.slice(2);
	let seq = null;
	let comp = null;
	if (args.length) {
		for (const a of args) {
			const j = JSON.parse(fs.readFileSync(a, 'utf8'));
			if (j.type === 'sequential') seq = j;
			else if (j.type === 'comprehensive') comp = j;
		}
	} else {
		const run = (s) =>
			JSON.parse(execFileSync('node', [path.join(ROOT, s), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));
		console.log('Running benchmark2.js --json ...');
		seq = run('benchmark2.js');
		console.log('Running benchmark.js --json ...');
		comp = run('benchmark.js');
	}
	return { seq, comp };
}

// ---- table generators ----
function seqRows(seq) {
	return SEQ_ORDER.map((name) => {
		const s = seq.scenarios[name];
		const min = Math.min(...LIBS.map((l) => s[l]));
		const cell = (l) => (s[l] === min ? `**${round(s[l])}ms**` : `${round(s[l])}ms`);
		let fc = COMPETS[0];
		for (const c of COMPETS) if (s[c] < s[fc]) fc = c;
		const vs =
			s['kk-date'] <= s[fc]
				? `**~${round(((s[fc] - s['kk-date']) / s['kk-date']) * 100)}% faster** than ${fc}`
				: `**~${round(((s['kk-date'] - s[fc]) / s[fc]) * 100)}% slower** than ${fc}`;
		return `| **${name}** | ${cell('kk-date')} | ${cell('Moment')} | ${cell('Day.js')} | ${cell('Luxon')} | ${vs} |`;
	});
}

function seqTable(seq) {
	return [
		'| Operation | kk-date | Moment.js | Day.js | Luxon | vs Fastest Competitor |',
		'|-----------|---------|-----------|--------|-------|-----------------------|',
		...seqRows(seq),
	].join('\n');
}

function overallTable(seq) {
	const o = seq.overall;
	const kk = o['kk-date'];
	const sortedComps = COMPETS.slice().sort((a, b) => o[a].ms - o[b].ms);
	const slowest = sortedComps[sortedComps.length - 1];
	const display = (c) => (c === 'Moment' ? 'Moment.js' : c);
	const rows = [`| **kk-date** | **${secs(kk.ms)}** | **${ops(kk.ops)} ops/sec** | 🏆 **Winner** |`];
	for (const c of sortedComps) {
		const pct = round(((o[c].ms - kk.ms) / kk.ms) * 100);
		const perf = c === slowest ? `**~${pct}% slower**` : `~${pct}% slower`;
		rows.push(`| ${display(c)} | ${secs(o[c].ms)} | ${ops(o[c].ops)} ops/sec | ${perf} |`);
	}
	return ['| Library | Total Time | Operations/sec | Performance |', '|---------|------------|---------------|-------------|', ...rows].join('\n');
}

function perfSeqTable(seq) {
	const o = seq.overall;
	const x = (o['Day.js'].ms / o['kk-date'].ms).toFixed(1);
	const overallRow = `| **Overall** | **${secs(o['kk-date'].ms)}** | ${secs(o['Moment'].ms)} | ${secs(o['Day.js'].ms)} | ${secs(o['Luxon'].ms)} | **~${x}x faster** than Day.js |`;
	return `${seqTable(seq)}\n${overallRow}`;
}

function memoryTable(comp) {
	const mem = comp.memory;
	const fmt = (v) => {
		const r = round(v);
		const sign = r > 0 ? '+' : r < 0 ? '-' : '';
		return `~${sign}${Math.abs(r)} MB${r < 0 ? '*' : ''}`;
	};
	const rows = [
		`| **kk-date** | ${fmt(mem['kk-date'])} | **${BUNDLE['kk-date']}** | **${DST['kk-date']}** |`,
		`| Moment.js | ${fmt(mem['Moment'])} | ${BUNDLE['Moment.js']} | ${DST['Moment.js']} |`,
		`| Day.js | ${fmt(mem['Day.js'])} | ${BUNDLE['Day.js']} | ${DST['Day.js']} |`,
		`| Luxon | ${fmt(mem['Luxon'])} | ${BUNDLE['Luxon']} | ${DST['Luxon']} |`,
	];
	return [
		'| Library | Heap Δ / 100k instances* | Bundle Size | DST Support |',
		'|---------|--------------------------|-------------|-------------|',
		...rows,
	].join('\n');
}

function cacheBullets(comp) {
	const c = comp.cache;
	return [
		`- **~${round(c.improvementPct)}% faster** repeated operations when cache is enabled`,
		`- Average operation time: ~${round(c.withoutMs)}ms → ~${round(c.withMs)}ms with cache`,
		`- Cache hit ratio: **${round(c.hitRatioPct)}%** for repeated operations`,
	].join('\n');
}

// ---- marker replacement ----
function replaceRegion(content, id, body) {
	const start = `<!-- BENCH:${id} -->`;
	const end = `<!-- /BENCH:${id} -->`;
	const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}`);
	if (!re.test(content)) {
		console.warn(`  ! marker not found: ${id} (skipped)`);
		return content;
	}
	return content.replace(re, `${start}\n${body}\n${end}`);
}

function main() {
	const { seq, comp } = loadInputs();

	let readme = fs.readFileSync(README, 'utf8');
	let perf = fs.readFileSync(PERF, 'utf8');

	if (seq?.scenarios && seq?.overall) {
		readme = replaceRegion(readme, 'readme-seq', seqTable(seq));
		readme = replaceRegion(readme, 'readme-overall', overallTable(seq));
		perf = replaceRegion(perf, 'perf-seq', perfSeqTable(seq));
	} else {
		console.warn('  ! no sequential benchmark data — skipped seq/overall/perf tables');
	}
	if (comp?.memory) readme = replaceRegion(readme, 'readme-memory', memoryTable(comp));
	if (comp?.cache) readme = replaceRegion(readme, 'readme-cache', cacheBullets(comp));
	if (!comp) console.warn('  ! no comprehensive benchmark data — skipped memory/cache');

	fs.writeFileSync(README, readme);
	fs.writeFileSync(PERF, perf);
	console.log('Benchmark docs refreshed: README.md, docs/PERFORMANCE.md');
}

main();
