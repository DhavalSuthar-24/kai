import crypto from 'crypto';

/**
 * Item Response Theory (IRT) Scoring
 * Questions have difficulty ratings (0.0 to 1.0)
 * Harder questions award more points
 */

export interface IRTQuestion {
  id: string;
  difficulty: number; // 0.0 (easy) to 1.0 (hard)
  correctAnswer: string;
}

export interface IRTAnswer {
  questionId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSeconds: number;
}

/**
 * Calculate IRT-weighted score
 * Score = Σ (correctness * question_difficulty)
 */
export function calculateIRTScore(answers: IRTAnswer[], questions: IRTQuestion[]): number {
  let totalScore = 0;
  let maxPossibleScore = 0;

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;

    maxPossibleScore += question.difficulty;

    if (answer.correct) {
      totalScore += question.difficulty;
    }
  });

  // Normalize to 0.0 - 1.0
  return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
}

/**
 * Calculate percentile ranking
 * Percentile = (# of scores below you / total scores) * 100
 */
export function calculatePercentile(yourScore: number, allScores: number[]): number {
  if (allScores.length === 0) return 100;

  const scoresBelow = allScores.filter((s) => s < yourScore).length;
  return (scoresBelow / allScores.length) * 100;
}

/**
 * Generate anonymized user ID for leaderboards
 * SHA-256(userId + salt)
 */
export function generateAnonId(userId: string, salt = 'leaderboard_salt_2024'): string {
  return crypto.createHash('sha256').update(userId + salt).digest('hex').substring(0, 16);
}

/**
 * Generate integrity hash for test questions
 * SHA-256 of question IDs + correct answers
 */
export function generateIntegrityHash(questions: IRTQuestion[]): string {
  const data = questions.map((q) => `${q.id}:${q.correctAnswer}`).join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify integrity hash
 */
export function verifyIntegrityHash(
  questions: IRTQuestion[],
  providedHash: string
): boolean {
  const calculatedHash = generateIntegrityHash(questions);
  return calculatedHash === providedHash;
}

/**
 * Assign difficulty to questions using IRT
 * Based on topic complexity and Bloom's taxonomy
 */
export function assignIRTDifficulty(
  bloomsLevel: string,
  topicComplexity: number
): number {
  const bloomsWeight: Record<string, number> = {
    remember: 0.2,
    understand: 0.4,
    apply: 0.6,
    analyze: 0.8,
    evaluate: 0.9,
    create: 1.0,
  };

  const baseWeight = bloomsWeight[bloomsLevel.toLowerCase()] || 0.5;
  const complexityFactor = topicComplexity / 10; // Assuming 0-10 scale

  // Combine Bloom's level and topic complexity
  return Math.min(1.0, (baseWeight + complexityFactor) / 2);
}
