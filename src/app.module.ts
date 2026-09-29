import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './infrastructure/config/env.validation';
import { ProductModule } from './product.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), ProductModule],
})
export class AppModule {}
