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
		// Unambiguous convention used everywhere: "% less/more time" (bounded at 100% on the
		// winning side) plus the speed multiple — a bare "% faster" compresses near 100%.
		const ratio = s[fc] / s['kk-date'];
		const vs =
			s['kk-date'] <= s[fc]
				? `**~${round(((s[fc] - s['kk-date']) / s[fc]) * 100)}% less time (${ratio.toFixed(1)}x faster)** than ${fc}`
				: `**~${round(((s['kk-date'] - s[fc]) / s[fc]) * 100)}% more time (${(s['kk-date'] / s[fc]).toFixed(1)}x slower)** than ${fc}`;
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
		const perfTxt = `~${pct}% more time (${(o[c].ms / kk.ms).toFixed(1)}x slower)`;
		const perf = c === slowest ? `**${perfTxt}**` : perfTxt;
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
		`- **~${round(c.improvementPct)}% less time** on repeated operations when cache is enabled`,
		`- Average operation time: ~${round(c.withoutMs)}ms → ~${round(c.withMs)}ms with cache`,
		`- Cache hit ratio: **${round(c.hitRatioPct)}%** for repeated operations`,
	].join('\n');
}

// Headline stats derived from both benchmark JSONs (used by the prose-bullet regions).
function derived(seq, comp) {
	const fp = comp.overall.kkDateFasterPct; // kk-date takes X% less time than each competitor (comprehensive)
	const avgFaster = round((fp.Moment + fp['Day.js'] + fp.Luxon) / 3);
	const tz = seq.scenarios['Timezone Conversions'];
	const kkTz = tz['kk-date'];
	// "% less time" = how much LESS time kk-date takes than a competitor: (1 - kk/comp) * 100.
	const tzMaxFaster = round(Math.max(...COMPETS.map((c) => (1 - kkTz / tz[c]) * 100)));
	const tzX = tz['Day.js'] / kkTz; // kk-date is this many TIMES faster than Day.js at tz conversion
	const tzXfloor = Math.floor(tzX / 10) * 10; // stable "over Nx" (only moves when it crosses a decade)
	const tzXpct = round((tzX - 1) * 100); // Day.js takes ~this many % MORE time
	const cachePct = round(comp.cache.improvementPct);
	// Sequential scenarios where any competitor beats kk-date in THIS run — drives the
	// win/concession wording below so the prose can never contradict the tables.
	const lostScenarios = SEQ_ORDER.filter((name) => COMPETS.some((c) => seq.scenarios[name][c] < seq.scenarios[name]['kk-date']));
	return { avgFaster, tzMaxFaster, tzXfloor, tzXpct, cachePct, lostScenarios };
}

function whyBullets(seq, comp) {
	const d = derived(seq, comp);
	return [
		`- **⚡ Lightning Fast** - Over ${d.tzXfloor}x faster timezone operations than Day.js`,
		d.lostScenarios.length
			? `- **🚀 ~${d.avgFaster}% Less Time Overall** - Wins most scenarios vs Moment.js, Day.js, and Luxon (slower in isolated "${d.lostScenarios.join('", "')}")`
			: `- **🚀 ~${d.avgFaster}% Less Time Overall** - Fastest in every scenario vs Moment.js, Day.js, and Luxon`,
		'- **💾 Memory Efficient** - Object pooling + LRU cache eviction keep long-running processes stable',
		`- **⚙️ Smart Caching** - ~${d.cachePct}% less time on repeated operations with built-in caching`,
	].join('\n');
}

function advantagesBullets(seq, comp) {
	const d = derived(seq, comp);
	return [
		`- **⚡ ~${d.avgFaster}% less time** on average vs competing libraries (comprehensive benchmark)`,
		`- **🚀 up to ~${d.tzMaxFaster}% less time** in timezone operations (critical for global apps)`,
		'- **📊 Big-data ready** - efficient for bulk/1M-operation workloads',
		'- **💾 Stable memory** - object pooling + LRU eviction; net heap delta is GC-dependent (often negative)',
		`- **⚙️ ~${d.cachePct}% less time** with smart caching enabled`,
		`- **🌍 Over ${d.tzXfloor}x faster** than Day.js in timezone conversions (Day.js takes ≈${d.tzXpct}% more time)`,
	].join('\n');
}

function perfMetricsBullets(seq, comp) {
	const d = derived(seq, comp);
	return [
		`- **~${d.avgFaster}% less time** on average vs competing libraries (comprehensive benchmark)`,
		`- **up to ~${d.tzMaxFaster}% less time** in timezone operations`,
		`- **~${d.cachePct}% less time** with caching enabled`,
		d.lostScenarios.length
			? `- **kk-date does not win every scenario** — slower in isolated "${d.lostScenarios.join('", "')}"`
			: '- **kk-date wins every scenario** in the current benchmark run',
		'- **Net memory delta is GC-dependent** (often negative for several libraries); stability comes from object pooling + LRU eviction',
		'- **Near-100% cache hit rate** for repeated operations',
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

	// Prose headline bullets need BOTH benchmarks (avg-faster + timezone + cache).
	if (seq?.scenarios && comp?.overall && comp?.cache) {
		readme = replaceRegion(readme, 'readme-why', whyBullets(seq, comp));
		readme = replaceRegion(readme, 'readme-advantages', advantagesBullets(seq, comp));
		perf = replaceRegion(perf, 'perf-metrics', perfMetricsBullets(seq, comp));
	} else {
		console.warn('  ! need both benchmarks for headline bullets — skipped why/advantages/metrics');
	}

	fs.writeFileSync(README, readme);
	fs.writeFileSync(PERF, perf);
	console.log('Benchmark docs refreshed: README.md, docs/PERFORMANCE.md');
}

main();
