/*
  Warnings:

  - You are about to drop the column `multiplicador` on the `NivelEspecializacion` table. All the data in the column will be lost.
  - You are about to drop the column `costoInsumoTintas` on the `Tecnica` table. All the data in the column will be lost.
  - You are about to drop the column `multiplicador` on the `Tecnica` table. All the data in the column will be lost.
  - You are about to drop the column `agujasIncluidas` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `agujasPrecioExtra` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the `ZonaPrecio` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `multiplicadorTarifa` to the `NivelEspecializacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `multiplicadorHoras` to the `Tecnica` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ZonaPrecio" DROP CONSTRAINT "ZonaPrecio_tenantId_fkey";

-- AlterTable
ALTER TABLE "NivelEspecializacion" DROP COLUMN "multiplicador",
ADD COLUMN     "multiplicadorTarifa" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Tecnica" DROP COLUMN "costoInsumoTintas",
DROP COLUMN "multiplicador",
ADD COLUMN     "multiplicadorHoras" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "agujasIncluidas",
DROP COLUMN "agujasPrecioExtra",
ADD COLUMN     "cmPorHora" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "minimoEstudio" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tarifaHoraria" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "ZonaPrecio";

-- CreateTable
CREATE TABLE "ZonaDificultad" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "multiplicador" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ZonaDificultad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZonaDificultad_tenantId_zona_key" ON "ZonaDificultad"("tenantId", "zona");

-- AddForeignKey
ALTER TABLE "ZonaDificultad" ADD CONSTRAINT "ZonaDificultad_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
