const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Black-box tests for the vendored nope-redis cache layer. Each test gets a fresh
// module instance (resetModules) and a fake clock so the 5s cleanup interval and
// second-resolution TTLs are deterministic without real waits.

describe('nope-redis cache layer', () => {
	let nopeRedis;

	beforeEach(() => {
		jest.resetModules();
		jest.useFakeTimers();
		nopeRedis = require('../nope-redis');
		nopeRedis.SERVICE_START();
	});

	afterEach(() => {
		nopeRedis.SERVICE_KILL_SYNC();
		jest.useRealTimers();
	});

	test('set/get round-trip and miss returns null', () => {
		expect(nopeRedis.setItemSync('answer', 42)).toBe(true);
		expect(nopeRedis.getItem('answer')).toBe(42);
		expect(nopeRedis.getItem('missing')).toBe(null);
	});

	test('cleanup interval removes expired keys', () => {
		nopeRedis.setItemSync('exp', 'v', 1);
		expect(nopeRedis.getItem('exp')).toBe('v');
		jest.advanceTimersByTime(6000); // killer runs every 5s; 6s passes the 1s TTL
		expect(nopeRedis.getItem('exp')).toBe(null);
	});

	test('deleteItem removes the key and its LRU slot', () => {
		nopeRedis.setItemSync('gone', 'v');
		expect(nopeRedis.deleteItem('gone')).toBe(true);
		expect(nopeRedis.getItem('gone')).toBe(null);
	});

	test('stats tracks misses separately from hits (feeds benchmark hit ratio)', () => {
		nopeRedis.setItemSync('present', 'v');
		nopeRedis.getItem('present'); // hit
		nopeRedis.getItem('absent-1'); // miss
		nopeRedis.getItem('absent-2'); // miss
		const stats = nopeRedis.stats();
		expect(stats.totalHits).toBe(1);
		expect(stats.totalMisses).toBe(2);
	});

	test('config updates defaultTtl after service start', () => {
		expect(nopeRedis.config({ defaultTtl: 900 })).toBe(true);
		expect(nopeRedis.stats().defaultTtl).toBe(900);
	});

	test('stats size reporting is well-formed', () => {
		nopeRedis.setItemSync('sized', 'x'.repeat(64));
		const stats = nopeRedis.stats({ showSize: true, showTotal: true, showKeys: false });
		expect(stats.size).toMatch(/bytes|KB|MB|GB/);
		expect(stats.total).toBe(1);
	});

	test('expired keys must not consume LRU eviction slots', () => {
		// Pre-fix: killer() deleted expired keys from the store but not from memory.lru,
		// so a stale key (1) wasted an eviction slot and (2) double-decremented totalKeys
		// via evictLRU. Walkthrough (MAX 10000, evict batch = 2000):
		//   stale expires -> insert k0..k10000 (10001 live keys) -> 'trigger' insert evicts.
		//   fixed:  evicts k0..k1999  -> store 8001 + trigger = 8002, k1999 gone
		//   buggy:  evicts stale,k0..k1998 (1999 real) -> store 8002 + trigger = 8003, k1999 alive
		nopeRedis.setItemSync('stale', 'v', 1);
		jest.advanceTimersByTime(6000); // killer expires 'stale'
		for (let i = 0; i <= 10000; i++) {
			nopeRedis.setItemSync(`k${i}`, i);
		}
		nopeRedis.setItemSync('trigger', 'v');
		const stats = nopeRedis.stats({ showKeys: true, showTotal: true });
		expect(stats.total).toBe(8002);
		expect(stats.keys).not.toContain('k1999');
		expect(stats.keys).toContain('k2000');
		expect(stats.keys).toContain('trigger');
	});

	test('overwriting the same key must not inflate the key counter', () => {
		// Pre-fix: setItemSync incremented totalKeys on every write, including overwrites
		// of an existing key. After 10001 overwrites the counter exceeded MAX_CACHE_SIZE,
		// so the next write triggered evictLRU, which purged the only real key.
		for (let i = 0; i <= 10000; i++) {
			nopeRedis.setItemSync('same', i);
		}
		nopeRedis.setItemSync('other', 'v');
		expect(nopeRedis.getItem('same')).toBe(10000);
		expect(nopeRedis.getItem('other')).toBe('v');
		expect(nopeRedis.stats({ showTotal: true }).total).toBe(2);
	});
});
