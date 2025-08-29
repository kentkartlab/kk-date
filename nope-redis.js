/* eslint-disable no-inner-declarations */
/**
 * nope-redis v1.3.5 editted
 * https://www.npmjs.com/package/nope-redis
 */
let defaultTtl = 1300;
let criticalError = 0;
let KILL_SERVICE = false;
const intervalSecond = 5;
let runnerInterval = null;
const MAX_CACHE_SIZE = 10000; // Maximum number of items in cache

const memory = {
	config: {
		status: false,
		killerIsFinished: true,
		lastKiller: 0,
		nextKiller: 0,
		totalHits: 0,
		nextMemoryStatsTime: 0,
		memoryStats: {},
		totalKeys: 0,
	},
	store: {},
	// LRU tracking
	lru: new Map(), // key -> timestamp
};

/**
 * no-redis config
 *
 * @param {object} options
 * @returns {boolean}
 */
module.exports.config = (options = { defaultTtl }) => {
	try {
		if (memory.config.status === false) {
			return false;
		}
		if (typeof options === 'object') {
			if (typeof options.defaultTtl === 'number' && options.defaultTtl > 0) {
				const now_ttl = Number.parseInt(options.defaultTtl, 10);
				if (typeof now_ttl === 'number') {
					defaultTtl = now_ttl;
				}
			}
			return true;
		}
	} catch (error) {
		console.error('nope-redis -> config error', error.message);
	}
	return false;
};

/**
 * LRU eviction - remove least recently used items
 */
function evictLRU() {
	if (memory.config.totalKeys <= MAX_CACHE_SIZE) {
		return;
	}

	// Sort by access time (least recent first)
	const sortedKeys = Array.from(memory.lru.entries())
		.sort((a, b) => a[1] - b[1])
		.map((entry) => entry[0]);

	// Remove oldest 20% of items
	const itemsToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
	const keysToRemove = sortedKeys.slice(0, itemsToRemove);

	// biome-ignore lint/complexity/noForEach: <explanation>
	keysToRemove.forEach((key) => {
		delete memory.store[key];
		memory.lru.delete(key);
		memory.config.totalKeys--;
	});
}

/**
 * set item to no-redis (sync version for performance)
 *
 * @param {string} key
 * @param {*} value
 * @param {number} ttl
 * @returns {Boolean}
 */
module.exports.setItemSync = (key, value, ttl = defaultTtl) => {
	try {
		const keyStr = `${key}`;
		if (!memory.config.status || typeof ttl !== 'number') {
			return false;
		}

		// Check if we need to evict items
		if (memory.config.totalKeys > MAX_CACHE_SIZE) {
			evictLRU();
		}

		memory.store[keyStr] = {
			value: value,
			hit: 0,
			expires_at: Math.floor(new Date() / 1000) + Number.parseInt(ttl, 10),
		};
		// Update LRU tracking
		memory.lru.set(keyStr, Date.now());
		memory.config.totalKeys++;

		return true;
	} catch (error) {
		console.error('nope-redis -> Cant Set Error! ', error.message);
		return false;
	}
};

/**
 * set item to no-redis (async version)
 *
 * @param {string} key
 * @param {*} value
 * @param {number} ttl
 * @returns {Boolean}
 */
module.exports.setItemAsync = async (key, value, ttl = defaultTtl) => {
	return module.exports.setItemSync(key, value, ttl);
};

/**
 * get item stats
 *
 * @param {string} key
 * @returns {object}
 */
module.exports.itemStats = (key) => {
	try {
		if (memory.store[`${key}`]) {
			return {
				expires_at: memory.store[`${key}`].expires_at,
				remaining_seconds: memory.store[`${key}`].expires_at - Math.floor(new Date() / 1000),
				hit: memory.store[`${key}`].hit,
			};
		}
		return null;
	} catch (error) {
		console.error('nope-redis -> Cant get item stats Error! ', error.message);
		return false;
	}
};

/**
 * get item from no-redis
 *
 * @param {string} key
 * @returns {*}
 */
module.exports.getItem = (key) => {
	if (!key) return null;
	const keyStr = `${key}`;
	try {
		if (!memory.config.status) {
			return false;
		}
		if (memory.store[keyStr]) {
			memory.store[keyStr].hit++;
			memory.config.totalHits++;

			// Update LRU tracking on access
			memory.lru.set(keyStr, Date.now());

			return memory.store[keyStr].value;
		}
		return null;
	} catch (error) {
		console.error('nope-redis -> Crital error! ', error.message);
		return false;
	}
};

/**
 * delete item from no-redis
 *
 * @param {string} key
 * @returns {Boolean}
 */
module.exports.deleteItem = (key) => {
	try {
		const keyStr = `${key}`;
		if (memory.config.status === false) {
			return false;
		}
		if (memory.store[keyStr]) {
			delete memory.store[keyStr];
			memory.lru.delete(keyStr);
			memory.config.totalKeys--;
		}
		return true;
	} catch (error) {
		console.error('nope-redis -> Cant delete item', error.message);
		return false;
	}
};

/**
 * flush all data
 *
 * @returns {Boolean}
 */
module.exports.flushAll = () => {
	try {
		if (memory.config.status === false) {
			return false;
		}
		// just store clean
		defaultMemory(false);
		return true;
	} catch (error) {
		console.error('nope-redis -> Cant flush!', error.message);
		return false;
	}
};

/**
 * get stats from noRedis
 *
 * @param {object} config
 * @returns {object}
 */
module.exports.stats = (config = { showKeys: true, showTotal: true, showSize: false }) => {
	try {
		const result = {
			status: memory.config.status,
			killerIsFinished: memory.config.killerIsFinished,
			lastKiller: memory.config.lastKiller,
			nextKiller: memory.config.nextKiller,
			criticalError,
			defaultTtl,
			totalHits: memory.config.totalHits,
			cacheSize: Object.keys(memory.store).length,
			maxCacheSize: MAX_CACHE_SIZE,
		};
		if (config.showTotal) {
			result.total = Object.keys(memory.store).length;
		}
		if (config.showSize) {
			result.size = roughSizeOfObject(memory.store);
		}
		if (config.showKeys) {
			result.keys = Object.keys(memory.store);
		}
		return result;
	} catch (error) {
		console.error('nope-redis -> stats error!', error.message);
		return false;
	}
};

/**
 * default memory set
 *
 * @param {Boolean} withConfig
 * @returns {Boolean}
 */
function defaultMemory(withConfig = false) {
	try {
		const defaultMemory = {
			config: {
				killerIsFinished: true,
				lastKiller: 0,
				nextKiller: 0,
				totalHits: 0,
				nextMemoryStatsTime: 0,
				status: false,
				memoryStats: {},
				totalKeys: 0,
			},
		};
		memory.store = {};
		memory.lru.clear();
		if (withConfig) {
			memory.config = JSON.parse(JSON.stringify(defaultMemory.config));
		}
	} catch (error) {
		console.error('nope-redis -> Cant default memory!', error.message);
		return false;
	}
}

/**
 * get object size
 *
 * @param {object} object
 * @returns {string}
 */
function roughSizeOfObject(object) {
	try {
		function formatSizeUnits(unit_bytes) {
			if (bytes >= 1073741824) {
				return `${(unit_bytes / 1073741824).toFixed(2)} GB`;
			}
			if (unit_bytes >= 1048576) {
				return `${(unit_bytes / 1048576).toFixed(2)} MB`;
			}
			if (unit_bytes >= 1024) {
				return `${(unit_bytes / 1024).toFixed(2)} KB`;
			}
			if (unit_bytes > 1) {
				return `${unit_bytes} bytes`;
			}
			if (unit_bytes === 1) {
				return `${unit_bytes} byte`;
			}
			return '0 bytes';
		}
		const objectList = [];
		const stack = [object];
		let bytes = 0;

		while (stack.length) {
			const value = stack.pop();

			if (typeof value === 'boolean') {
				bytes += 4;
			} else if (typeof value === 'string') {
				bytes += value.length * 2;
			} else if (typeof value === 'number') {
				bytes += 8;
			} else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
				objectList.push(value);
				for (const i in value) {
					stack.push(value[i]);
				}
			}
		}
		return formatSizeUnits(bytes);
	} catch (error) {
		console.error('nope-redis -> roughSizeOfObject error!', error.message);
		return 'Error !';
	}
}

/**
 * deleter for expired key
 */
function killer() {
	memory.config.killerIsFinished = false;
	for (const property in memory.store) {
		if (memory.store[`${property}`].expires_at < Math.floor(new Date() / 1000)) {
			delete memory.store[`${property}`];
			memory.config.totalKeys--;
		}
	}
	memory.config.killerIsFinished = true;
	memory.config.lastKiller = Math.floor(new Date() / 1000);
}

module.exports.SERVICE_KILL = async () => {
	KILL_SERVICE = true;
	return true;
};

module.exports.SERVICE_KILL_SYNC = () => {
	KILL_SERVICE = true;
	clearInterval(runnerInterval);
	defaultMemory(true);
	KILL_SERVICE = false;
	return true;
};

module.exports.SERVICE_START = () => {
	if (KILL_SERVICE === false && memory.config.status === false && memory.config.lastKiller === 0) {
		return runner();
	}
	return false;
};

/**
 * init runner
 */
function runner() {
	try {
		if (memory.config.status === false) {
			if (criticalError <= 3) {
				memory.config.status = true;
			} else {
				console.error('nope-redis -> critic error, nope-redis not started');
				return false;
			}
		}
		runnerInterval = setInterval(() => {
			try {
				if (KILL_SERVICE) {
					clearInterval(runnerInterval);
					defaultMemory(true);
					KILL_SERVICE = false;
					return true;
				}
				if (memory.config.killerIsFinished) {
					killer();
				}
				memory.config.nextKiller = Math.floor(new Date() / 1000) + intervalSecond;
			} catch (error) {
				console.error('nope-redis -> Critical Error flushed all data! > ', error.message);
				clearInterval(runnerInterval);
				defaultMemory(true);
				criticalError++;
				runner();
			}
		}, intervalSecond * 1000);
	} catch (error) {
		console.error('nope-redis -> Critical Error flushed all data! > ', error.message);
		if (typeof runnerInterval !== 'undefined') {
			clearInterval(runnerInterval);
		}
		defaultMemory(true);
		criticalError++;
		if (memory.config.status === false) {
			runner();
		}
		return false;
	}
}

module.exports.runner = runner;
