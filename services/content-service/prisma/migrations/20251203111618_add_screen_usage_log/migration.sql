-- CreateTable
CREATE TABLE "ScreenUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "category" TEXT,
    "duration" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenUsageLog_userId_timestamp_idx" ON "ScreenUsageLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ScreenUsageLog_userId_appName_idx" ON "ScreenUsageLog"("userId", "appName");

-- CreateIndex
CREATE INDEX "ScreenUsageLog_timestamp_idx" ON "ScreenUsageLog"("timestamp");
