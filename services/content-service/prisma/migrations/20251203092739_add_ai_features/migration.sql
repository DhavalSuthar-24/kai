-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" TEXT,
    "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
    "extractedText" TEXT,
    "entities" TEXT,
    "sentiment" TEXT,
    "importanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenshotMetadata" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "ocrText" TEXT,
    "detectedApp" TEXT,
    "detectedUrl" TEXT,
    "hasText" BOOLEAN NOT NULL DEFAULT false,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "hasCode" BOOLEAN NOT NULL DEFAULT false,
    "dominantColors" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenshotMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedContent" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "position" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRanking" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "recencyScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Capture_userId_idx" ON "Capture"("userId");

-- CreateIndex
CREATE INDEX "Capture_userId_importanceScore_idx" ON "Capture"("userId", "importanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenshotMetadata_captureId_key" ON "ScreenshotMetadata"("captureId");

-- CreateIndex
CREATE INDEX "ScreenshotMetadata_captureId_idx" ON "ScreenshotMetadata"("captureId");

-- CreateIndex
CREATE INDEX "ExtractedContent_captureId_idx" ON "ExtractedContent"("captureId");

-- CreateIndex
CREATE INDEX "ExtractedContent_contentType_idx" ON "ExtractedContent"("contentType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRanking_captureId_key" ON "ContentRanking"("captureId");

-- CreateIndex
CREATE INDEX "ContentRanking_userId_finalScore_idx" ON "ContentRanking"("userId", "finalScore");

-- CreateIndex
CREATE INDEX "ContentRanking_userId_isEssential_idx" ON "ContentRanking"("userId", "isEssential");
