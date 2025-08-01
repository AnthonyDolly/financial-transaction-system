import { createClient } from 'redis';
import { config } from '../config/env';

const redisConfig = {
  socket: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  },
  ...(config.REDIS_PASSWORD && { password: config.REDIS_PASSWORD }),
};

export const redisClient = createClient(redisConfig);

redisClient.on('error', err => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
}

export async function disconnectRedis() {
  if (redisClient.isOpen) {
    try {
      await redisClient.disconnect();
      console.log('Disconnected from Redis');
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }
}
