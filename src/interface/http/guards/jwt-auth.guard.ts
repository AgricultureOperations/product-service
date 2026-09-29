import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { EnvironmentVariables } from '../../../infrastructure/config/env.validation';

/** Claims auth-service puts in its tokens, besides iss/aud/exp. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Validates auth-service HS256 tokens: signature, issuer, audience and expiry, like order-service.
 * Returns 401 (never 403) for a missing, invalid or expired token, so the frontend logs the user out.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = await this.jwt.verifyAsync<AuthenticatedUser>(token, {
        secret: this.config.get('JWT_SECRET', { infer: true }),
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }
}
