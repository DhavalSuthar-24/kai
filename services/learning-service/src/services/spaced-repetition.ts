export interface ReviewResult {
  nextReview: Date;
  interval: number;
  easeFactor: number;
}

export class SpacedRepetition {
  // SM-2 Algorithm
  // quality: 0-5 (0 = blackout, 5 = perfect)
  calculate(previousInterval: number, previousEaseFactor: number, quality: number): ReviewResult {
    let interval: number;
    let easeFactor: number;

    if (quality < 3) {
      // If the user failed, start over
      interval = 1;
      easeFactor = previousEaseFactor; // Don't change ease factor on failure
    } else {
      if (previousInterval === 0) {
        interval = 1;
      } else if (previousInterval === 1) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * previousEaseFactor);
      }

      // Update ease factor
      // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      easeFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      
      // Minimum ease factor is 1.3
      if (easeFactor < 1.3) {
        easeFactor = 1.3;
      }
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      nextReview,
      interval,
      easeFactor,
    };
  }
}
