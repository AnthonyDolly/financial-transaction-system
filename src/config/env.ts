import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRE_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRE_IN: z.string().default('30d'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // Swagger
  SWAGGER_TITLE: z.string().default('Financial Transaction System API'),
  SWAGGER_DESCRIPTION: z.string().default('API para sistema de transacciones financieras'),
  SWAGGER_VERSION: z.string().default('1.0.0'),
  SWAGGER_CONTACT_NAME: z.string().default('Anthony Dolly'),
  SWAGGER_CONTACT_EMAIL: z.string().default('anthonyluiggydollyo@gmail.com'),

  // Development
  ENABLE_CORS: z.coerce.boolean().default(true),
  TRUST_PROXY: z.coerce.boolean().default(false),
  ALLOWED_ORIGINS: z.string().optional(),

  // Nginx
  NGINX_PORT: z.coerce.number().default(80),
  NGINX_PORT_SSL: z.coerce.number().default(443),

  // Default password
  DEFAULT_PASSWORD: z.string(),

  // Azure
  AZURE_APP_NAME: z.string(),
});

const parseEnv = (): z.infer<typeof envSchema> => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export const config = parseEnv();
