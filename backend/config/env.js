const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters long'),
  AI_SERVICE_URL: z.string().url('AI_SERVICE_URL must be a valid URL'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').default('redis://127.0.0.1:6379'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  SERVICE_NAME: z.string().default('finexa-backend'),
  APP_VERSION: z.string().default('2.0.0'),
  CORS_ORIGINS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OTEL_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Environment validation failed:\n${issues}`);
}

const data = parsed.data;
const defaultLogLevel = data.NODE_ENV === 'development' ? 'debug' : 'info';

/**
 * Validated application configuration.
 */
const config = {
  nodeEnv: data.NODE_ENV,
  isProduction: data.NODE_ENV === 'production',
  isDevelopment: data.NODE_ENV === 'development',
  port: data.PORT,
  mongodbUri: data.MONGODB_URI,
  jwtSecret: data.JWT_SECRET,
  aiServiceUrl: data.AI_SERVICE_URL,
  clientUrl: data.CLIENT_URL,
  redisUrl: data.REDIS_URL,
  logLevel: data.LOG_LEVEL || defaultLogLevel,
  serviceName: data.SERVICE_NAME,
  appVersion: data.APP_VERSION,
  corsOrigins: (data.CORS_ORIGINS || data.CLIENT_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  openAiApiKey: data.OPENAI_API_KEY,
  otelEnabled: data.OTEL_ENABLED || false,
};

module.exports = config;
