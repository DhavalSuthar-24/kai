-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "friendChallenges" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kaizenReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memoryOfDay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyInsights" BOOLEAN NOT NULL DEFAULT true;
