import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../infrastructure/config/env.validation';
import { HttpExceptionFilter } from './filters/http-exception.filter';

/** HTTP setup shared by `main.ts` and the integration tests, so tests exercise the real pipeline. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.enableCors({ origin: config.get('FRONTEND_URL', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
}
