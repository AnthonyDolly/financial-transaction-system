import { createClient } from 'redis';
import { config } from '../config/env';

// Construir URL de Redis con las variables de entorno
const redisHost = config.REDIS_HOST || 'localhost';
const redisPort = config.REDIS_PORT || '6379';
const redisPassword = config.REDIS_PASSWORD;

const redisUrl = redisPassword 
  ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
  : `redis://${redisHost}:${redisPort}`;

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
}

export async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
    console.log('Disconnected from Redis');
  }
}
