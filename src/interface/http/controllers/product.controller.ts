import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreateProductDto,
  ListProductsQueryDto,
  PaginatedProductsResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../../../application/dtos';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductByIdUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from '../../../application/use-cases';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

const uuidPipe = new ParseUUIDPipe();

@ApiTags('products')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired JWT' })
@UseGuards(JwtAuthGuard)
@Controller('api/v1/products')
export class ProductController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly getProductById: GetProductByIdUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.createProduct.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products, newest first, with pagination and filters' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedProductsResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid query parameters' })
  list(@Query() query: ListProductsQueryDto): Promise<PaginatedProductsResponseDto> {
    return this.listProducts.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findOne(@Param('id', uuidPipe) id: string): Promise<ProductResponseDto> {
    return this.getProductById.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update some fields of a product' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: HttpStatus.OK, type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'SKU already exists' })
  update(@Param('id', uuidPipe) id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    return this.updateProduct.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product permanently' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  remove(@Param('id', uuidPipe) id: string): Promise<void> {
    return this.deleteProduct.execute(id);
  }
}
