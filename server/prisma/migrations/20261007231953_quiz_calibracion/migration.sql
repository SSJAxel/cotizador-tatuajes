-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "fijoPreparacion" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EstiloTenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "estilo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstiloTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiempoEstiloZona" (
    "id" TEXT NOT NULL,
    "estiloTenantId" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL,

    CONSTRAINT "TiempoEstiloZona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstiloTenant_tenantId_estilo_key" ON "EstiloTenant"("tenantId", "estilo");

-- CreateIndex
CREATE UNIQUE INDEX "TiempoEstiloZona_estiloTenantId_zona_key" ON "TiempoEstiloZona"("estiloTenantId", "zona");

-- AddForeignKey
ALTER TABLE "EstiloTenant" ADD CONSTRAINT "EstiloTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TiempoEstiloZona" ADD CONSTRAINT "TiempoEstiloZona_estiloTenantId_fkey" FOREIGN KEY ("estiloTenantId") REFERENCES "EstiloTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
