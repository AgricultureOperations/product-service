import { IProductRepository } from '../../src/domain';

export function mockProductRepository(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findBySku: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    delete: jest.fn().mockResolvedValue(true),
  };
}
