-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('harvest', 'input', 'equipment');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'discontinued');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "scientific_name" VARCHAR(200),
    "active_ingredient" VARCHAR(200),
    "safety_period_days" INTEGER,
    "is_hazardous" BOOLEAN NOT NULL DEFAULT false,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "presentation_size" DECIMAL(12,3),
    "presentation_unit" VARCHAR(20),
    "cost_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "min_stock_level" INTEGER NOT NULL DEFAULT 0,
    "max_stock_level" INTEGER,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "requires_batch_tracking" BOOLEAN NOT NULL DEFAULT false,
    "requires_expiration" BOOLEAN NOT NULL DEFAULT false,
    "storage_conditions" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_product_type_idx" ON "products"("product_type");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");
