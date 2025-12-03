-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "topic" TEXT,
    "allowedApps" TEXT NOT NULL,
    "blockedApps" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "interruptions" INTEGER NOT NULL DEFAULT 0,
    "pomodoroCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusInterruption" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusInterruption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_userId_idx" ON "FocusSession"("userId");

-- CreateIndex
CREATE INDEX "FocusSession_userId_status_idx" ON "FocusSession"("userId", "status");

-- CreateIndex
CREATE INDEX "FocusSession_startedAt_idx" ON "FocusSession"("startedAt");

-- CreateIndex
CREATE INDEX "FocusInterruption_sessionId_idx" ON "FocusInterruption"("sessionId");

-- CreateIndex
CREATE INDEX "FocusInterruption_timestamp_idx" ON "FocusInterruption"("timestamp");
