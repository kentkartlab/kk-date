/* eslint-disable no-inner-declarations */
/**
 * nope-redis v1.3.5 editted
 * https://www.npmjs.com/package/nope-redis
 */
let defaultTtl = 30;
let isMemoryStatsEnabled = false;
let criticalError = 0;
let KILL_SERVICE = false;
const intervalSecond = 5;
let runnerInterval = null;

const memory = {
	config: {
		status: false,
		killerIsFinished: true,
		lastKiller: 0,
		nextKiller: 0,
		totalHits: 0,
		nextMemoryStatsTime: 0,
		memoryStats: {},
	},
	store: {},
};

/**
 * no-redis config
 *
 * @param {object} options
 * @returns {boolean}
 */
module.exports.config = (options = { isMemoryStatsEnabled, defaultTtl }) => {
	try {
		if (memory.config.status === false) {
			return false;
		}
		if (typeof options === 'object') {
			if (typeof options.isMemoryStatsEnabled === 'boolean') {
				isMemoryStatsEnabled = options.isMemoryStatsEnabled;
			}
			if (typeof options.defaultTtl === 'number' && options.defaultTtl > 0) {
				const now_ttl = Number.parseInt(options.defaultTtl, 10);
				if (Number.isNaN(now_ttl) === false) {
					defaultTtl = now_ttl;
				}
			}
			return true;
		}
	} catch (error) {
		console.error('nope-redis -> config error', error);
	}
	return false;
};

/**
 * set item to no-redis
 *
 * @param {string} key
 * @param {*} value
 * @param {number} ttl
 * @returns {Boolean}
 */
module.exports.setItem = (key, value, ttl = defaultTtl) => {
	try {
		if (memory.config.status === false) {
			return false;
		}
		if (typeof key !== 'string') {
			return false;
		}
		if (typeof ttl !== 'number') {
			return false;
		}
		ttl = Number.parseInt(ttl, 10);
		memory.store[`${key}`] = {
			value: null,
			hit: 0,
			expires_at: null,
		};
		memory.store[`${key}`].value = value;
		memory.store[`${key}`].hit = 0;
		memory.store[`${key}`].expires_at = Math.floor(new Date() / 1000) + ttl;
		return true;
	} catch (error) {
		console.error('nope-redis -> Cant Set Error! ', error);
		return false;
	}
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
		console.error('nope-redis -> Cant get item stats Error! ', error);
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
	try {
		if (memory.config.status === false) {
			return false;
		}
		if (typeof key !== 'string') {
			return false;
		}
		if (memory.store[`${key}`] && memory.store[`${key}`].expires_at > Math.floor(new Date() / 1000)) {
			memory.store[`${key}`].hit++;
			memory.config.totalHits++;
			return memory.store[`${key}`].value;
		}
		return null;
	} catch (error) {
		console.error('nope-redis -> Crital error! ', error);
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
		if (memory.config.status === false) {
			return false;
		}
		if (memory.store[`${key}`]) {
			memory.store[`${key}`].value = null;
			memory.store[`${key}`].hit = null;
			memory.store[`${key}`].expires_at = null;
			delete memory.store[`${key}`];
		}
		return true;
	} catch (error) {
		console.error('nope-redis -> Cant delete item', error);
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
		console.error('nope-redis -> Cant flush!', error);
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
			isMemoryStatsEnabled,
		};
		if (isMemoryStatsEnabled) {
			result.nextMemoryStatsTime = memory.config.nextMemoryStatsTime;
			result.memoryStats = memory.config.memoryStats;
		}
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
		console.error('nope-redis -> stats error!', error);
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
			},
		};
		memory.store = {};
		if (withConfig) {
			memory.config = JSON.parse(JSON.stringify(defaultMemory.config));
		}
	} catch (error) {
		console.error('nope-redis -> Cant default memory!', error);
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
			let bytes = '';
			if (bytes >= 1073741824) {
				bytes = `${(unit_bytes / 1073741824).toFixed(2)} GB`;
			} else if (unit_bytes >= 1048576) {
				bytes = `${(unit_bytes / 1048576).toFixed(2)} MB`;
			} else if (unit_bytes >= 1024) {
				bytes = `${(unit_bytes / 1024).toFixed(2)} KB`;
			} else if (unit_bytes > 1) {
				bytes = `${unit_bytes} bytes`;
			} else if (unit_bytes === 1) {
				bytes = `${unit_bytes} byte`;
			} else {
				bytes = '0 bytes';
			}
			return bytes;
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
		console.error('nope-redis -> roughSizeOfObject error!', error);
		return 'Error !';
	}
}

async function memoryStats() {
	try {
		const date = new Date();
		memory.config.memoryStats[
			`${`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}T${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`}`
		] = roughSizeOfObject(memory.store);
		const keys = Object.keys(memory.config.memoryStats);
		if (keys.length > 25) {
			for (let i = 0; i < 12; i++) {
				const key = keys[i];
				delete memory.config.memoryStats[key];
			}
		}
	} catch (error) {
		console.error('nope-redis -> error!', error);
		return false;
	}
}

/**
 * deleter for expired key
 */
function killer() {
	memory.config.killerIsFinished = false;
	for (const property in memory.store) {
		if (memory.store[`${property}`].expires_at < Math.floor(new Date() / 1000)) {
			memory.store[`${property}`] = null;
			delete memory.store[`${property}`];
		}
	}
	memory.config.killerIsFinished = true;
	memory.config.lastKiller = Math.floor(new Date() / 1000);
	if (isMemoryStatsEnabled) {
		if (Math.floor(new Date() / 1000) >= memory.config.nextMemoryStatsTime) {
			memory.config.nextMemoryStatsTime = Math.floor(new Date() / 1000) + 1 * 60 * 60;
			memoryStats();
		}
	}
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
				console.error('nope-redis -> Critical Error flushed all data! > ', error);
				clearInterval(runnerInterval);
				defaultMemory(true);
				criticalError++;
				runner();
			}
		}, intervalSecond * 1000);
	} catch (error) {
		console.error('nope-redis -> Critical Error flushed all data! > ', error);
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
