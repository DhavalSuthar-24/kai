-- CreateIndex
CREATE INDEX "Capture_type_idx" ON "Capture"("type");

-- CreateIndex
CREATE INDEX "Capture_status_idx" ON "Capture"("status");

-- CreateIndex
CREATE INDEX "Capture_aiProcessed_idx" ON "Capture"("aiProcessed");

-- CreateIndex
CREATE INDEX "Capture_createdAt_idx" ON "Capture"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Capture_userId_createdAt_idx" ON "Capture"("userId", "createdAt" DESC);

-- Add search_vector column
ALTER TABLE "Capture" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, '') || ' ' || coalesce("extractedText", '') || ' ' || coalesce(source, ''))
  ) STORED;

-- Create GIN index
CREATE INDEX "idx_capture_search" ON "Capture" USING GIN("search_vector");
