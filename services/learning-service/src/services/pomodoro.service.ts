import { createLogger } from '@shared/index';

const logger = createLogger('pomodoro-service');

export interface PomodoroState {
  phase: 'WORK' | 'BREAK' | 'LONG_BREAK';
  timeRemaining: number; // seconds
  cycleCount: number;
  isActive: boolean;
}

export class PomodoroTimer {
  private state: PomodoroState;
  private interval: NodeJS.Timeout | null = null;
  private onTick?: (state: PomodoroState) => void;
  private onPhaseChange?: (phase: string) => void;

  constructor() {
    this.state = {
      phase: 'WORK',
      timeRemaining: 25 * 60, // 25 minutes in seconds
      cycleCount: 0,
      isActive: false
    };
  }

  start(onTick?: (state: PomodoroState) => void, onPhaseChange?: (phase: string) => void) {
    this.onTick = onTick;
    this.onPhaseChange = onPhaseChange;
    this.state.isActive = true;

    logger.info('Pomodoro timer started');

    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (!this.state.isActive) return;

    this.state.timeRemaining--;

    // Emit current state
    if (this.onTick) {
      this.onTick({ ...this.state });
    }

    // Check if phase is complete
    if (this.state.timeRemaining <= 0) {
      this.completePhase();
    }
  }

  private completePhase() {
    logger.info(`Pomodoro phase completed: ${this.state.phase}`);

    if (this.state.phase === 'WORK') {
      this.state.cycleCount++;

      // After 4 work cycles, take a long break
      if (this.state.cycleCount % 4 === 0) {
        this.state.phase = 'LONG_BREAK';
        this.state.timeRemaining = 15 * 60; // 15 minutes
      } else {
        this.state.phase = 'BREAK';
        this.state.timeRemaining = 5 * 60; // 5 minutes
      }
    } else {
      // Break is over, back to work
      this.state.phase = 'WORK';
      this.state.timeRemaining = 25 * 60; // 25 minutes
    }

    if (this.onPhaseChange) {
      this.onPhaseChange(this.state.phase);
    }
  }

  pause() {
    this.state.isActive = false;
    logger.info('Pomodoro timer paused');
  }

  resume() {
    this.state.isActive = true;
    logger.info('Pomodoro timer resumed');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.state.isActive = false;
    logger.info('Pomodoro timer stopped');
  }

  getState(): PomodoroState {
    return { ...this.state };
  }

  reset() {
    this.stop();
    this.state = {
      phase: 'WORK',
      timeRemaining: 25 * 60,
      cycleCount: 0,
      isActive: false
    };
  }
}
