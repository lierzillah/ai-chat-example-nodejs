const Redis = require('ioredis');
const logger = require('../logger/logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('error', (err) => {
  logger.error('redis_error', { error: err, stack: err.stack });
});

redis.on('connect', () => {
  logger.info('redis_connected');
});

module.exports = redis;