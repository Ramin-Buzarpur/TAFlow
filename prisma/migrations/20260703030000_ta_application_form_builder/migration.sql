-- AlterTable
ALTER TABLE "TAApplication" ADD COLUMN     "customFieldsJson" JSONB;

-- AlterTable
ALTER TABLE "TAOpportunity" ADD COLUMN     "formConfigJson" JSONB,
ADD COLUMN     "opensAt" TIMESTAMP(3);
