import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductByIdUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from './application/use-cases';
import { IProductRepository, PRODUCT_REPOSITORY } from './domain';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { ProductController } from './interface/http/controllers/product.controller';
import { JwtAuthGuard } from './interface/http/guards/jwt-auth.guard';

const USE_CASES = [
  CreateProductUseCase,
  GetProductByIdUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
];

/**
 * Composition root for the product feature. Binds the repository port to its Prisma adapter and
 * builds the use cases with factories, so the application layer carries no Nest DI decorators.
 */
@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [ProductController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    ...USE_CASES.map((UseCase) => ({
      provide: UseCase,
      useFactory: (repository: IProductRepository) => new UseCase(repository),
      inject: [PRODUCT_REPOSITORY],
    })),
    JwtAuthGuard,
  ],
})
export class ProductModule {}
