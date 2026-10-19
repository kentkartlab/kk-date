const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * Runs `body` in a fresh Node process whose system timezone is `tz` and returns its JSON output.
 * Scenarios that depend on the system zone (a UTC container, a system DST gap, the system-zone fast
 * paths) must not depend on the zone of the machine running the tests. `kk_date` is in scope;
 * Date.now() is pinned to `nowMs` when given.
 *
 * @param {string} tz
 * @param {string} body - function body returning a JSON-serializable value
 * @param {number} [nowMs]
 * @returns {*}
 */
function runInZone(tz, body, nowMs) {
	const index = JSON.stringify(path.join(__dirname, '..', '..', 'index.js'));
	const pin = nowMs === undefined ? '' : `Date.now = () => ${nowMs};`;
	const script = `${pin} const kk_date = require(${index}); const out = (() => { ${body} })(); process.stdout.write(JSON.stringify(out));`;
	const result = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 20000 });
	if (result.status !== 0) {
		throw new Error(result.stderr || `child process exited with ${result.status}`);
	}
	return JSON.parse(result.stdout);
}

module.exports = { runInZone };
