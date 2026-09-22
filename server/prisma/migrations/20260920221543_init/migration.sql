-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "agujasIncluidas" INTEGER NOT NULL DEFAULT 1,
    "agujasPrecioExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaPrecio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "precioPorCm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ZonaPrecio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tecnica" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "multiplicador" DOUBLE PRECISION NOT NULL,
    "costoInsumoTintas" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Tecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelEspecializacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "multiplicador" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NivelEspecializacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalidadProducto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "costoFijo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CalidadProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "franja" TEXT NOT NULL,
    "recargoPorcentual" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ZonaPrecio_tenantId_zona_key" ON "ZonaPrecio"("tenantId", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "Tecnica_tenantId_nombre_key" ON "Tecnica"("tenantId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "NivelEspecializacion_tenantId_nivel_key" ON "NivelEspecializacion"("tenantId", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "CalidadProducto_tenantId_nivel_key" ON "CalidadProducto"("tenantId", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "Horario_tenantId_franja_key" ON "Horario"("tenantId", "franja");

-- AddForeignKey
ALTER TABLE "ZonaPrecio" ADD CONSTRAINT "ZonaPrecio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tecnica" ADD CONSTRAINT "Tecnica_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelEspecializacion" ADD CONSTRAINT "NivelEspecializacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalidadProducto" ADD CONSTRAINT "CalidadProducto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
