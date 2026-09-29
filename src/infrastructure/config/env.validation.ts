export interface EnvironmentVariables {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  FRONTEND_URL: string;
}

const MIN_SECRET_BYTES = 32;

/** Used by `ConfigModule.forRoot({ validate })`: fails startup on missing or invalid settings. */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const str = (key: string, fallback?: string): string => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable ${key}`);
  };

  const port = Number(str('PORT', '3001'));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const secret = str('JWT_SECRET');
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes (HS256)`);
  }

  return {
    PORT: port,
    DATABASE_URL: str('DATABASE_URL'),
    JWT_SECRET: secret,
    JWT_ISSUER: str('JWT_ISSUER', 'auth-service'),
    JWT_AUDIENCE: str('JWT_AUDIENCE', 'orders-api'),
    FRONTEND_URL: str('FRONTEND_URL', 'http://localhost:5173'),
  };
}
