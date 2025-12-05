-- Add performance indexes for Gamification Service

-- UserProgress indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_userprogress_points ON "UserProgress"("points" DESC);
CREATE INDEX IF NOT EXISTS idx_userprogress_level ON "UserProgress"("level" DESC);

-- DailyActivity indexes for user activity history
CREATE INDEX IF NOT EXISTS idx_dailyactivity_user_date ON "DailyActivity"("userId", "date" DESC);

-- Achievement indexes for user achievements
CREATE INDEX IF NOT EXISTS idx_userachievement_user ON "UserAchievement"("userId");
CREATE INDEX IF NOT EXISTS idx_userachievement_unlocked ON "UserAchievement"("unlockedAt" DESC);

-- Challenge indexes for active challenges
CREATE INDEX IF NOT EXISTS idx_challenge_status ON "Challenge"("status");
CREATE INDEX IF NOT EXISTS idx_challenge_enddate ON "Challenge"("endDate");

-- MockTestLeaderboard indexes for ranking
CREATE INDEX IF NOT EXISTS idx_leaderboard_topic_rank ON "MockTestLeaderboard"("topicId", "rank");
