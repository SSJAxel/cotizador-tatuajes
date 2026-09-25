/*
  Warnings:

  - You are about to drop the `NivelEspecializacion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NivelEspecializacion" DROP CONSTRAINT "NivelEspecializacion_tenantId_fkey";

-- DropTable
DROP TABLE "NivelEspecializacion";
