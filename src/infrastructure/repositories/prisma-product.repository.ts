import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IProductRepository,
  Page,
  PageRequest,
  Product,
  ProductFilter,
  ProductNotFoundError,
  SkuAlreadyExistsError,
} from '../../domain';
import { PrismaService } from '../prisma/prisma.service';
import { ProductMapper } from './product.mapper';

const UNIQUE_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(product: Product): Promise<void> {
    try {
      await this.prisma.product.create({ data: ProductMapper.toPersistence(product) });
    } catch (error) {
      throw this.translate(error, product);
    }
  }

  async update(product: Product): Promise<void> {
    const { id, createdAt: _createdAt, ...data } = ProductMapper.toPersistence(product);
    try {
      await this.prisma.product.update({ where: { id }, data });
    } catch (error) {
      throw this.translate(error, product);
    }
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { sku: Product.normalizeSku(sku) } });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async findMany(filter: ProductFilter, { page, limit }: PageRequest): Promise<Page<Product>> {
    const where: Prisma.ProductWhereInput = {
      category: filter.category,
      productType: filter.productType,
      status: filter.status,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: rows.map(ProductMapper.toDomain), total };
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.product.deleteMany({ where: { id } });
    return count > 0;
  }

  private translate(error: unknown, product: Product): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === UNIQUE_VIOLATION) return new SkuAlreadyExistsError(product.sku);
      if (error.code === RECORD_NOT_FOUND) return new ProductNotFoundError(product.id);
    }
    return error;
  }
}
