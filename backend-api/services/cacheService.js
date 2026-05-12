import NodeCache from 'node-cache';

// Cache en memoria con TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const cacheService = {
  get(key) {
    return cache.get(key);
  },

  set(key, value, ttl = 3600) {
    cache.set(key, value, ttl);
  },

  delete(key) {
    cache.del(key);
  },

  clear() {
    cache.flushAll();
  },

  getStats() {
    return cache.getStats();
  }
};

export default cacheService;
