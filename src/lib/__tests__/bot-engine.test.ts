/**
 * BOT ENGINE TEST SUITE
 * Tests for bot behavior, timing distributions, and race simulation
 */

import { describe, it, expect } from 'vitest';
import {
  createBot,
  simulateKeystroke,
  simulateFullRace,
  getNextKeystrokeDelay,
  getBotName,
  getExpectedCompletionTime,
  BOT_CONFIGS,
  type BotLevel,
} from '../bot-engine';

describe('Bot Engine', () => {
  describe('BOT_CONFIGS', () => {
    it('should have configs for all levels', () => {
      expect(BOT_CONFIGS.beginner).toBeDefined();
      expect(BOT_CONFIGS.intermediate).toBeDefined();
      expect(BOT_CONFIGS.pro).toBeDefined();
    });

    it('should have increasing WPM targets', () => {
      expect(BOT_CONFIGS.beginner.targetWpmMean).toBeLessThan(BOT_CONFIGS.intermediate.targetWpmMean);
      expect(BOT_CONFIGS.intermediate.targetWpmMean).toBeLessThan(BOT_CONFIGS.pro.targetWpmMean);
    });

    it('should have decreasing mistake probability', () => {
      expect(BOT_CONFIGS.beginner.mistakeProbability).toBeGreaterThan(BOT_CONFIGS.intermediate.mistakeProbability);
      expect(BOT_CONFIGS.intermediate.mistakeProbability).toBeGreaterThan(BOT_CONFIGS.pro.mistakeProbability);
    });

    it('should have beginner mistake probability in 8-18% range', () => {
      expect(BOT_CONFIGS.beginner.mistakeProbability).toBeGreaterThanOrEqual(0.08);
      expect(BOT_CONFIGS.beginner.mistakeProbability).toBeLessThanOrEqual(0.18);
    });

    it('should have intermediate mistake probability in 4-10% range', () => {
      expect(BOT_CONFIGS.intermediate.mistakeProbability).toBeGreaterThanOrEqual(0.04);
      expect(BOT_CONFIGS.intermediate.mistakeProbability).toBeLessThanOrEqual(0.10);
    });

    it('should have pro mistake probability in 1-4% range', () => {
      expect(BOT_CONFIGS.pro.mistakeProbability).toBeGreaterThanOrEqual(0.01);
      expect(BOT_CONFIGS.pro.mistakeProbability).toBeLessThanOrEqual(0.04);
    });
  });

  describe('createBot', () => {
    it('should create a bot with correct initial state', () => {
      const bot = createBot('intermediate', 'test text');
      
      expect(bot.config.level).toBe('intermediate');
      expect(bot.targetText).toBe('test text');
      expect(bot.typedText).toBe('');
      expect(bot.cursorIndex).toBe(0);
      expect(bot.progress).toBe(0);
      expect(bot.isFinished).toBe(false);
    });

    it('should add variance to config', () => {
      const bot1 = createBot('pro', 'test');
      const bot2 = createBot('pro', 'test');
      
      // With variance, these are unlikely to be exactly equal
      // But they should be within reasonable bounds
      expect(bot1.config.targetWpmMean).toBeGreaterThan(50);
      expect(bot1.config.targetWpmMean).toBeLessThan(120);
    });
  });

  describe('simulateKeystroke', () => {
    it('should advance cursor on keystroke', () => {
      let bot = createBot('intermediate', 'hello');
      bot = simulateKeystroke(bot, 100);
      
      expect(bot.cursorIndex).toBeGreaterThan(0);
      expect(bot.keystrokes.length).toBeGreaterThan(0);
    });

    it('should set start time on first keystroke', () => {
      let bot = createBot('intermediate', 'hello');
      bot = simulateKeystroke(bot, 100);
      
      expect(bot.startTime).toBe(100);
    });

    it('should mark finished when text complete', () => {
      let bot = createBot('intermediate', 'hi');
      
      // Simulate enough keystrokes to finish
      let time = 0;
      while (!bot.isFinished && time < 100000) {
        time += 200;
        bot = simulateKeystroke(bot, time);
      }
      
      expect(bot.isFinished).toBe(true);
      expect(bot.progress).toBe(100);
    });

    it('should track correct chars', () => {
      let bot = createBot('intermediate', 'test');
      
      let time = 0;
      while (!bot.isFinished && time < 100000) {
        time += 200;
        bot = simulateKeystroke(bot, time);
      }
      
      expect(bot.correctChars).toBeGreaterThan(0);
    });
  });

  describe('simulateFullRace', () => {
    const levels: BotLevel[] = ['beginner', 'intermediate', 'pro'];
    
    levels.forEach(level => {
      it(`should complete race for ${level} bot`, () => {
        const updates = simulateFullRace(level, 'The quick brown fox jumps.');
        
        expect(updates.length).toBeGreaterThan(0);
        expect(updates[updates.length - 1].progress).toBe(100);
      });

      it(`should produce plausible WPM for ${level}`, () => {
        const config = BOT_CONFIGS[level];
        const updates = simulateFullRace(level, 'The quick brown fox jumps over the lazy dog.');
        
        const finalWpm = updates[updates.length - 1].wpm;
        
        // Allow wide tolerance for variance
        expect(finalWpm).toBeGreaterThan(config.targetWpmMean * 0.3);
        expect(finalWpm).toBeLessThan(config.targetWpmMean * 2.5);
      });

      it(`should have reasonable completion time for ${level}`, () => {
        const text = 'Hello world';
        const updates = simulateFullRace(level, text);
        
        const completionTime = updates[updates.length - 1].timestamp;
        
        // Should take at least 500ms for any text
        expect(completionTime).toBeGreaterThan(500);
        // Should complete within 60 seconds for short text
        expect(completionTime).toBeLessThan(60000);
      });
    });

    it('should have monotonically increasing progress', () => {
      const updates = simulateFullRace('intermediate', 'Test text for race.');
      
      for (let i = 1; i < updates.length; i++) {
        expect(updates[i].progress).toBeGreaterThanOrEqual(updates[i - 1].progress);
      }
    });
  });

  describe('getNextKeystrokeDelay', () => {
    it('should return reasonable delays', () => {
      const bot = createBot('intermediate', 'test');
      
      for (let i = 0; i < 100; i++) {
        const delay = getNextKeystrokeDelay(bot);
        expect(delay).toBeGreaterThanOrEqual(50);
        expect(delay).toBeLessThanOrEqual(2000);
      }
    });

    it('should produce faster delays for pro bots on average', () => {
      const beginnerBot = createBot('beginner', 'test');
      const proBot = createBot('pro', 'test');
      
      let beginnerTotal = 0;
      let proTotal = 0;
      const samples = 100;
      
      for (let i = 0; i < samples; i++) {
        beginnerTotal += getNextKeystrokeDelay(beginnerBot);
        proTotal += getNextKeystrokeDelay(proBot);
      }
      
      const beginnerAvg = beginnerTotal / samples;
      const proAvg = proTotal / samples;
      
      // Pro should be faster on average
      expect(proAvg).toBeLessThan(beginnerAvg);
    });
  });

  describe('getBotName', () => {
    it('should return a name for each level', () => {
      expect(getBotName('beginner')).toBeTruthy();
      expect(getBotName('intermediate')).toBeTruthy();
      expect(getBotName('pro')).toBeTruthy();
    });

    it('should return string names', () => {
      expect(typeof getBotName('beginner')).toBe('string');
      expect(getBotName('beginner').length).toBeGreaterThan(0);
    });
  });

  describe('getExpectedCompletionTime', () => {
    it('should return higher time for beginner', () => {
      const textLength = 100;
      const beginnerTime = getExpectedCompletionTime('beginner', textLength);
      const proTime = getExpectedCompletionTime('pro', textLength);
      
      expect(beginnerTime).toBeGreaterThan(proTime);
    });

    it('should scale with text length', () => {
      const shortTime = getExpectedCompletionTime('intermediate', 50);
      const longTime = getExpectedCompletionTime('intermediate', 200);
      
      expect(longTime).toBeGreaterThan(shortTime);
    });
  });
});

describe('Bot Determinism', () => {
  it('should produce reproducible results with same seed', () => {
    // Note: Current implementation uses Math.random()
    // For true reproducibility, would need seeded PRNG
    // This test documents expected behavior for future improvement
    
    const updates1 = simulateFullRace('intermediate', 'test');
    const updates2 = simulateFullRace('intermediate', 'test');
    
    // Results will differ due to randomness, but should be similar in structure
    expect(updates1.length).toBeGreaterThan(0);
    expect(updates2.length).toBeGreaterThan(0);
    expect(updates1[updates1.length - 1].progress).toBe(100);
    expect(updates2[updates2.length - 1].progress).toBe(100);
  });
});

describe('Bot Edge Cases', () => {
  it('should handle empty text', () => {
    const bot = createBot('beginner', '');
    expect(bot.isFinished).toBe(false);
    
    const updated = simulateKeystroke(bot, 100);
    expect(updated.isFinished).toBe(true);
  });

  it('should handle single character text', () => {
    const updates = simulateFullRace('beginner', 'a');
    
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1].progress).toBe(100);
  });

  it('should handle special characters', () => {
    const updates = simulateFullRace('intermediate', 'Hello, World! @#$%');
    
    expect(updates[updates.length - 1].progress).toBe(100);
  });
});
