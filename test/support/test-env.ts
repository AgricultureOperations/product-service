import { JwtService } from '@nestjs/jwt';

export const TEST_ENV = {
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused?schema=product',
  JWT_SECRET: 'test-secret-that-is-at-least-32-bytes-long!!',
  JWT_ISSUER: 'auth-service',
  JWT_AUDIENCE: 'orders-api',
  FRONTEND_URL: 'http://localhost:5173',
};

/** Sets the variables `validateEnv` needs, unless the caller already set them (e.g. a real DATABASE_URL). */
export function applyTestEnv(): void {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] ??= value;
  }
}

/** Signs a token the way auth-service does: HS256, payload { id, email } plus iss/aud/exp. */
export function signToken(
  overrides: { secret?: string; issuer?: string; audience?: string; expiresIn?: number } = {},
): string {
  return new JwtService().sign(
    { id: '7f1c3a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b', email: 'farmer@example.com' },
    {
      secret: overrides.secret ?? process.env.JWT_SECRET,
      issuer: overrides.issuer ?? process.env.JWT_ISSUER,
      audience: overrides.audience ?? process.env.JWT_AUDIENCE,
      expiresIn: overrides.expiresIn ?? 3600,
      algorithm: 'HS256',
    },
  );
}
