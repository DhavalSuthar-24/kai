-- AlterTable
ALTER TABLE "Capture" ADD COLUMN     "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "processingError" TEXT;

-- CreateIndex
CREATE INDEX "Capture_ocrStatus_idx" ON "Capture"("ocrStatus");
