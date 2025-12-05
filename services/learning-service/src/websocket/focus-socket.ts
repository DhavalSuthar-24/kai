import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { PomodoroTimer } from '../services/pomodoro.service';
import { trackInterruption, incrementPomodoroCount } from '../services/focus-session.service';
import { createLogger } from '@shared/index';

const logger = createLogger('focus-socket');

// Store active timers per session
const activeTimers = new Map<string, PomodoroTimer>();

export function initializeFocusSocket(io: SocketServer) {
  // Logic now uses passed io instance instead of creating new one

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Start focus session with timer
    socket.on('focus:start', (data: { sessionId: string; duration: number }) => {
      logger.info(`Starting focus timer for session: ${data.sessionId}`);

      const timer = new PomodoroTimer();
      activeTimers.set(data.sessionId, timer);

      // Start timer with callbacks
      timer.start(
        // On tick - send timer update
        (state) => {
          socket.emit('focus:timer', {
            sessionId: data.sessionId,
            phase: state.phase,
            timeRemaining: state.timeRemaining,
            cycleCount: state.cycleCount
          });
        },
        // On phase change
        async (phase) => {
          socket.emit('focus:phase-change', {
            sessionId: data.sessionId,
            phase
          });

          // Increment pomodoro count when work phase completes
          if (phase === 'BREAK' || phase === 'LONG_BREAK') {
            await incrementPomodoroCount(data.sessionId);
          }
        }
      );

      socket.emit('focus:started', { sessionId: data.sessionId });
    });

    // Track interruption
    socket.on('focus:interruption', async (data: { sessionId: string; appName: string }) => {
      logger.info(`Interruption tracked: ${data.appName} in session ${data.sessionId}`);

      await trackInterruption(data.sessionId, data.appName);

      socket.emit('focus:interruption-logged', {
        sessionId: data.sessionId,
        appName: data.appName
      });
    });

    // Pause timer
    socket.on('focus:pause', (data: { sessionId: string }) => {
      const timer = activeTimers.get(data.sessionId);
      if (timer) {
        timer.pause();
        socket.emit('focus:paused', { sessionId: data.sessionId });
      }
    });

    // Resume timer
    socket.on('focus:resume', (data: { sessionId: string }) => {
      const timer = activeTimers.get(data.sessionId);
      if (timer) {
        timer.resume();
        socket.emit('focus:resumed', { sessionId: data.sessionId });
      }
    });

    // End focus session
    socket.on('focus:end', (data: { sessionId: string }) => {
      logger.info(`Ending focus session: ${data.sessionId}`);

      const timer = activeTimers.get(data.sessionId);
      if (timer) {
        timer.stop();
        activeTimers.delete(data.sessionId);
      }

      socket.emit('focus:ended', { sessionId: data.sessionId });
    });

    // Get current timer state
    socket.on('focus:get-state', (data: { sessionId: string }) => {
      const timer = activeTimers.get(data.sessionId);
      if (timer) {
        const state = timer.getState();
        socket.emit('focus:state', {
          sessionId: data.sessionId,
          ...state
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Focus WebSocket server initialized');
  return io;
}
