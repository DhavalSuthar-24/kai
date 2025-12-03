-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL DEFAULT 0,
    "actions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "appName" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BehaviorMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionSuccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "userAction" TEXT,
    "timeToAction" INTEGER,
    "contextBefore" TEXT,
    "contextAfter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionSuccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoomscrollEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "scrollDistance" DOUBLE PRECISION,
    "itemsViewed" INTEGER,
    "interventionId" TEXT,
    "wasInterrupted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoomscrollEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "BehaviorMetric_userId_date_idx" ON "BehaviorMetric"("userId", "date");

-- CreateIndex
CREATE INDEX "BehaviorMetric_userId_metricType_idx" ON "BehaviorMetric"("userId", "metricType");

-- CreateIndex
CREATE INDEX "InterventionSuccess_userId_idx" ON "InterventionSuccess"("userId");

-- CreateIndex
CREATE INDEX "InterventionSuccess_ruleId_idx" ON "InterventionSuccess"("ruleId");

-- CreateIndex
CREATE INDEX "InterventionSuccess_userId_triggeredAt_idx" ON "InterventionSuccess"("userId", "triggeredAt");

-- CreateIndex
CREATE INDEX "DoomscrollEvent_userId_idx" ON "DoomscrollEvent"("userId");

-- CreateIndex
CREATE INDEX "DoomscrollEvent_userId_startedAt_idx" ON "DoomscrollEvent"("userId", "startedAt");
