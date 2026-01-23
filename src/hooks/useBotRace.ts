import { useState, useEffect, useRef, useCallback } from 'react';
import { createBot, BotDifficulty, BotRunner } from '@/lib/bot-engine';

interface UseBotRaceProps {
  isActive: boolean;
  expectedText: string;
  difficulty: BotDifficulty;
  onBotProgress: (progress: number, wpm: number, accuracy: number) => void;
  onBotFinish: (wpm: number, accuracy: number) => void;
}

export const useBotRace = ({
  isActive,
  expectedText,
  difficulty,
  onBotProgress,
  onBotFinish,
}: UseBotRaceProps) => {
  const botRef = useRef<BotRunner | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);

  // Initialize bot when race becomes active
  useEffect(() => {
    if (isActive && expectedText && !botRef.current) {
      botRef.current = createBot(difficulty, expectedText);
      botRef.current.start();
      finishedRef.current = false;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, expectedText, difficulty]);

  // Run bot simulation loop
  useEffect(() => {
    if (!isActive || !botRef.current) return;

    const runBotLoop = () => {
      if (!botRef.current || finishedRef.current) return;

      const state = botRef.current.tick();
      const progress = Math.round((state.cursorIndex / expectedText.length) * 100);
      
      onBotProgress(progress, state.currentWpm, state.accuracy);

      // Check if bot finished
      if (state.isFinished && !finishedRef.current) {
        finishedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onBotFinish(state.currentWpm, state.accuracy);
      }
    };

    // Run bot tick every 50ms for smooth updates
    intervalRef.current = setInterval(runBotLoop, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, expectedText, onBotProgress, onBotFinish]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    botRef.current = null;
    finishedRef.current = false;
  }, []);

  return {
    botState: botRef.current?.state || null,
    reset,
  };
};
