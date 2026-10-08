-- AlterTable
ALTER TABLE "EstiloTenant" ADD COLUMN     "tecnicas" TEXT[] DEFAULT ARRAY[]::TEXT[];
