import { describe, it, expect } from 'vitest';
import {
  BOT_CONFIGS,
  createBot,
  createBotState,
  getNextKeystrokeDelay,
  simulateKeystroke,
  simulateFullRace,
  getBotName,
  getExpectedCompletionTime,
} from '../bot-engine';

describe('Bot Engine', () => {
  describe('BOT_CONFIGS', () => {
    it('should have configs for all three levels', () => {
      expect(BOT_CONFIGS.beginner).toBeDefined();
      expect(BOT_CONFIGS.intermediate).toBeDefined();
      expect(BOT_CONFIGS.pro).toBeDefined();
    });

    it('pro should have highest WPM', () => {
      expect(BOT_CONFIGS.pro.targetWpmMean).toBeGreaterThan(BOT_CONFIGS.beginner.targetWpmMean);
    });
  });

  describe('createBotState', () => {
    it('should create initial bot state correctly', () => {
      const state = createBotState('beginner', 'test text');
      expect(state.targetText).toBe('test text');
      expect(state.typedText).toBe('');
      expect(state.cursorIndex).toBe(0);
    });
  });

  describe('createBot (BotRunner)', () => {
    it('should create a bot runner with methods', () => {
      const bot = createBot('beginner', 'hello');
      expect(typeof bot.start).toBe('function');
      expect(typeof bot.tick).toBe('function');
    });

    it('should track state after start', () => {
      const bot = createBot('beginner', 'hello');
      bot.start();
      expect(bot.state.startTime).toBeGreaterThan(0);
    });
  });

  describe('simulateFullRace', () => {
    it('should complete race', () => {
      const updates = simulateFullRace('beginner', 'hello');
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1].progress).toBe(100);
    });
  });

  describe('getBotName', () => {
    it('should return names', () => {
      expect(getBotName('beginner').length).toBeGreaterThan(0);
      expect(getBotName('pro').length).toBeGreaterThan(0);
    });
  });
});
