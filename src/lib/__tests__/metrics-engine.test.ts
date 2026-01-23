/**
 * TYPING ENGINE TEST SUITE
 * Comprehensive unit tests for metrics, accuracy, and bot behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWpm,
  calculateRawWpm,
  calculateAccuracy,
  calculateConsistency,
  calculateWpmWindows,
  computeSessionMetrics,
  calculateProgress,
  sanitizeMetric,
  reconstructTypedText,
  verifyMetrics,
  type KeystrokeRecord,
} from '../metrics-engine';

describe('Metrics Engine', () => {
  describe('calculateWpm', () => {
    it('should return 0 for 0 elapsed time', () => {
      expect(calculateWpm(50, 0)).toBe(0);
    });

    it('should calculate correct WPM (standard formula)', () => {
      // 50 correct chars in 60000ms (1 minute) = 10 WPM (50/5)
      expect(calculateWpm(50, 60000)).toBe(10);
    });

    it('should handle 30 second test', () => {
      // 25 correct chars in 30000ms (0.5 min) = 10 WPM
      expect(calculateWpm(25, 30000)).toBe(10);
    });

    it('should calculate high WPM correctly', () => {
      // 400 correct chars in 60000ms = 80 WPM
      expect(calculateWpm(400, 60000)).toBe(80);
    });
  });

  describe('calculateAccuracy', () => {
    it('should return 100% for perfect typing', () => {
      expect(calculateAccuracy(100, 0, 0, 0, false)).toBe(100);
    });

    it('should cap at 99.99% when backspace used', () => {
      expect(calculateAccuracy(100, 0, 0, 0, true)).toBe(99.99);
    });

    it('should calculate correct accuracy with errors', () => {
      // 90 correct, 10 incorrect = 90%
      expect(calculateAccuracy(90, 10, 0, 0, false)).toBe(90);
    });

    it('should include missed chars in denominator', () => {
      // 80 correct, 10 incorrect, 10 missed = 80%
      expect(calculateAccuracy(80, 10, 10, 0, false)).toBe(80);
    });

    it('should include extra chars in denominator', () => {
      // 80 correct, 0 incorrect, 0 missed, 20 extra = 80%
      expect(calculateAccuracy(80, 0, 0, 20, false)).toBe(80);
    });

    it('should return 100% for empty test', () => {
      expect(calculateAccuracy(0, 0, 0, 0, false)).toBe(100);
    });
  });

  describe('calculateConsistency', () => {
    it('should return 100 for single WPM value', () => {
      expect(calculateConsistency([50])).toBe(100);
    });

    it('should return 100 for perfectly consistent WPM', () => {
      expect(calculateConsistency([50, 50, 50, 50])).toBe(100);
    });

    it('should return lower score for variable WPM', () => {
      const consistency = calculateConsistency([20, 40, 60, 80, 100]);
      expect(consistency).toBeLessThan(100);
      expect(consistency).toBeGreaterThan(0);
    });

    it('should filter out zero values', () => {
      expect(calculateConsistency([50, 0, 50, 0, 50])).toBe(100);
    });

    it('should clamp between 0 and 100', () => {
      const consistency = calculateConsistency([1, 100, 1, 100, 1, 100]);
      expect(consistency).toBeGreaterThanOrEqual(0);
      expect(consistency).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 for no progress', () => {
      expect(calculateProgress(0, 100)).toBe(0);
    });

    it('should return 100 for complete', () => {
      expect(calculateProgress(100, 100)).toBe(100);
    });

    it('should cap at 100', () => {
      expect(calculateProgress(150, 100)).toBe(100);
    });

    it('should handle zero length', () => {
      expect(calculateProgress(10, 0)).toBe(0);
    });

    it('should calculate partial progress', () => {
      expect(calculateProgress(50, 100)).toBe(50);
    });
  });

  describe('sanitizeMetric', () => {
    it('should return 0 for NaN', () => {
      expect(sanitizeMetric(NaN)).toBe(0);
    });

    it('should return 0 for Infinity', () => {
      expect(sanitizeMetric(Infinity)).toBe(0);
    });

    it('should return 0 for -Infinity', () => {
      expect(sanitizeMetric(-Infinity)).toBe(0);
    });

    it('should return 0 for negative when not allowed', () => {
      expect(sanitizeMetric(-5, false)).toBe(0);
    });

    it('should allow negative when specified', () => {
      expect(sanitizeMetric(-5, true)).toBe(-5);
    });

    it('should pass through valid values', () => {
      expect(sanitizeMetric(42.5)).toBe(42.5);
    });
  });
});

describe('Keystroke Processing', () => {
  const createKeystroke = (
    char: string,
    expected: string,
    timestamp: number,
    isBackspace: boolean = false
  ): KeystrokeRecord => ({
    session_id: 'test-session',
    char_expected: expected,
    char_typed: char,
    event_type: 'keydown',
    timestamp_ms: timestamp,
    cursor_index: 0,
    is_backspace: isBackspace,
    is_correct: char === expected && !isBackspace,
  });

  describe('reconstructTypedText', () => {
    it('should reconstruct simple text', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('h', 'h', 0),
        createKeystroke('e', 'e', 100),
        createKeystroke('l', 'l', 200),
        createKeystroke('l', 'l', 300),
        createKeystroke('o', 'o', 400),
      ];
      expect(reconstructTypedText(keystrokes)).toBe('hello');
    });

    it('should handle backspaces', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('h', 'h', 0),
        createKeystroke('e', 'e', 100),
        createKeystroke('x', 'l', 200), // typo
        createKeystroke('', '', 300, true), // backspace
        createKeystroke('l', 'l', 400),
        createKeystroke('l', 'l', 500),
        createKeystroke('o', 'o', 600),
      ];
      expect(reconstructTypedText(keystrokes)).toBe('hello');
    });

    it('should handle multiple consecutive backspaces', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('h', 'h', 0),
        createKeystroke('e', 'e', 100),
        createKeystroke('l', 'l', 200),
        createKeystroke('', '', 300, true),
        createKeystroke('', '', 400, true),
        createKeystroke('', '', 500, true),
      ];
      expect(reconstructTypedText(keystrokes)).toBe('');
    });
  });

  describe('computeSessionMetrics', () => {
    it('should compute correct metrics for perfect typing', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('t', 't', 0),
        createKeystroke('e', 'e', 200),
        createKeystroke('s', 's', 400),
        createKeystroke('t', 't', 600),
      ];
      
      const metrics = computeSessionMetrics(keystrokes, 'test', 'test');
      
      expect(metrics.accuracy).toBe(100);
      expect(metrics.correctChars).toBe(4);
      expect(metrics.incorrectChars).toBe(0);
      expect(metrics.backspaceCount).toBe(0);
      expect(metrics.isValid).toBe(true);
    });

    it('should cap accuracy at 99.99% with backspace', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('t', 't', 0),
        createKeystroke('x', 'e', 200), // typo
        createKeystroke('', '', 400, true), // backspace
        createKeystroke('e', 'e', 600),
        createKeystroke('s', 's', 800),
        createKeystroke('t', 't', 1000),
      ];
      
      const metrics = computeSessionMetrics(keystrokes, 'test', 'test');
      
      expect(metrics.accuracy).toBe(99.99);
      expect(metrics.backspaceCount).toBe(1);
    });

    it('should handle empty keystrokes', () => {
      const metrics = computeSessionMetrics([], 'test', '');
      
      expect(metrics.isValid).toBe(false);
      expect(metrics.validationErrors).toContain('No keystrokes recorded');
    });

    it('should calculate missed chars correctly', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('t', 't', 0),
        createKeystroke('e', 'e', 200),
      ];
      
      const metrics = computeSessionMetrics(keystrokes, 'test', 'te');
      
      expect(metrics.missedChars).toBe(2); // 'st' not typed
    });
  });

  describe('calculateWpmWindows', () => {
    it('should create windows for long sessions', () => {
      const keystrokes: KeystrokeRecord[] = [];
      // Create 10 seconds of typing at ~60 WPM
      for (let i = 0; i < 50; i++) {
        keystrokes.push(createKeystroke('a', 'a', i * 200));
      }
      
      const windows = calculateWpmWindows(keystrokes, 5000, 1000);
      
      expect(windows.length).toBeGreaterThan(0);
      windows.forEach(w => {
        expect(w.wpm).toBeGreaterThanOrEqual(0);
        expect(isFinite(w.wpm)).toBe(true);
      });
    });

    it('should return empty for short sessions', () => {
      const keystrokes: KeystrokeRecord[] = [
        createKeystroke('a', 'a', 0),
        createKeystroke('b', 'b', 100),
      ];
      
      const windows = calculateWpmWindows(keystrokes, 5000, 1000);
      
      expect(windows.length).toBe(0);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle zero character session', () => {
    const metrics = computeSessionMetrics([], '', '');
    expect(metrics.accuracy).toBe(100);
    expect(metrics.netWpm).toBe(0);
  });

  it('should handle only backspace session', () => {
    const keystrokes: KeystrokeRecord[] = [
      { session_id: 'test', char_expected: '', char_typed: '', event_type: 'keydown', timestamp_ms: 0, cursor_index: 0, is_backspace: true, is_correct: false },
      { session_id: 'test', char_expected: '', char_typed: '', event_type: 'keydown', timestamp_ms: 100, cursor_index: 0, is_backspace: true, is_correct: false },
    ];
    
    const metrics = computeSessionMetrics(keystrokes, 'test', '');
    expect(metrics.backspaceCount).toBe(2);
  });

  it('should not produce negative WPM', () => {
    const metrics = computeSessionMetrics([], 'test', '');
    expect(metrics.rawWpm).toBeGreaterThanOrEqual(0);
    expect(metrics.netWpm).toBeGreaterThanOrEqual(0);
  });

  it('should clamp consistency between 0-100', () => {
    // Extreme variance
    const highVariance = calculateConsistency([1, 200, 1, 200]);
    expect(highVariance).toBeGreaterThanOrEqual(0);
    expect(highVariance).toBeLessThanOrEqual(100);
  });
});
