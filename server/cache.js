// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(req) {
  return `${req.method}:${req.url}:${JSON.stringify(req.params)}:${JSON.stringify(req.query)}`;
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.duration) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache(key, data, duration = CACHE_DURATION) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    duration
  });
}

export {
  getCacheKey,
  getFromCache,
  setCache,
  CACHE_DURATION
}; 