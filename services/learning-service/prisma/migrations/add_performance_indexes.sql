-- Add performance indexes for Learning Service

-- ReviewLog indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_reviewlog_user_reviewed ON "ReviewLog"("userId", "reviewedAt");
CREATE INDEX IF NOT EXISTS idx_reviewlog_flashcard ON "ReviewLog"("flashcardId");
CREATE INDEX IF NOT EXISTS idx_reviewlog_topic ON "ReviewLog"("topicId");

-- Flashcard indexes for review scheduler
CREATE INDEX IF NOT EXISTS idx_flashcard_nextreview ON "Flashcard"("nextReview");
CREATE INDEX IF NOT EXISTS idx_flashcard_user_nextreview ON "Flashcard"("userId", "nextReview");

-- Topic indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_topic_user ON "Topic"("userId");
CREATE INDEX IF NOT EXISTS idx_topic_parent ON "Topic"("parentId");

-- DailyActivity indexes for progress tracking
CREATE INDEX IF NOT EXISTS idx_dailyactivity_user_date ON "DailyActivity"("userId", "date");
