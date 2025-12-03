-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "nextReview" TIMESTAMP(3) NOT NULL,
    "interval" INTEGER NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerCondition" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionTarget" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesTriggered" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaizenSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "sessionType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "activitiesCount" INTEGER NOT NULL DEFAULT 0,
    "capturesCount" INTEGER NOT NULL DEFAULT 0,
    "flashcardsCount" INTEGER NOT NULL DEFAULT 0,
    "productivityScore" DOUBLE PRECISION,
    "notes" TEXT,
    "mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KaizenSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "relatedIds" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "metrics" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'POSITIVE',
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenTimePattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "appName" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "longestSession" INTEGER NOT NULL DEFAULT 0,
    "isDoomscroll" BOOLEAN NOT NULL DEFAULT false,
    "scrollVelocity" DOUBLE PRECISION,
    "interactionRate" DOUBLE PRECISION,
    "timeOfDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenTimePattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterventionRule_userId_idx" ON "InterventionRule"("userId");

-- CreateIndex
CREATE INDEX "InterventionRule_userId_isActive_idx" ON "InterventionRule"("userId", "isActive");

-- CreateIndex
CREATE INDEX "KaizenSession_userId_idx" ON "KaizenSession"("userId");

-- CreateIndex
CREATE INDEX "KaizenSession_userId_startedAt_idx" ON "KaizenSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "MemoryInsight_userId_idx" ON "MemoryInsight"("userId");

-- CreateIndex
CREATE INDEX "MemoryInsight_userId_createdAt_idx" ON "MemoryInsight"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryInsight_userId_isViewed_idx" ON "MemoryInsight"("userId", "isViewed");

-- CreateIndex
CREATE INDEX "ScreenTimePattern_userId_date_idx" ON "ScreenTimePattern"("userId", "date");

-- CreateIndex
CREATE INDEX "ScreenTimePattern_userId_isDoomscroll_idx" ON "ScreenTimePattern"("userId", "isDoomscroll");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenTimePattern_userId_date_appName_key" ON "ScreenTimePattern"("userId", "date", "appName");
