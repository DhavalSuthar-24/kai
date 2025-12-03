-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "detectedApp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contentType" TEXT,
    "contentId" TEXT,
    "contentPreview" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intervention_userId_status_idx" ON "Intervention"("userId", "status");

-- CreateIndex
CREATE INDEX "Intervention_userId_triggeredAt_idx" ON "Intervention"("userId", "triggeredAt");

-- CreateIndex
CREATE INDEX "Intervention_status_expiresAt_idx" ON "Intervention"("status", "expiresAt");
