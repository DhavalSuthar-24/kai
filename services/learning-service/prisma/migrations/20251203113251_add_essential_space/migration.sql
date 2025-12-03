-- CreateTable
CREATE TABLE "EssentialSpaceItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "metadata" TEXT,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssentialSpaceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EssentialSpaceFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssentialSpaceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EssentialSpaceItem_userId_shownAt_idx" ON "EssentialSpaceItem"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "EssentialSpaceItem_userId_itemType_idx" ON "EssentialSpaceItem"("userId", "itemType");

-- CreateIndex
CREATE INDEX "EssentialSpaceFeedback_userId_idx" ON "EssentialSpaceFeedback"("userId");

-- CreateIndex
CREATE INDEX "EssentialSpaceFeedback_itemType_idx" ON "EssentialSpaceFeedback"("itemType");

-- CreateIndex
CREATE INDEX "EssentialSpaceFeedback_userId_createdAt_idx" ON "EssentialSpaceFeedback"("userId", "createdAt");
