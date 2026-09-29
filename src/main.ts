import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './infrastructure/config/env.validation';
import { configureApp } from './interface/http/configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AgriOps Product Service')
    .setDescription('Product catalog for agricultural inputs, harvested crops and equipment')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  const port = app.get(ConfigService<EnvironmentVariables, true>).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
