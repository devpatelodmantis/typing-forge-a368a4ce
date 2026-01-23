/**
 * BOT ENGINE - Simulates human-like typing for race mode
 * Supports three difficulty levels with realistic behavior patterns
 */

import { calculateWpm, calculateProgress } from './metrics-engine';

export type BotLevel = 'beginner' | 'intermediate' | 'pro';

export interface BotConfig {
  level: BotLevel;
  targetWpmMean: number;
  targetWpmStdDev: number;
  mistakeProbability: number; // 0-1
  correctionDelay: [number, number]; // [min, max] ms before correcting
  burstProbability: number; // Probability of typing burst
  hesitationProbability: number; // Probability of hesitation
  // Inter-keystroke interval params (log-normal)
  ikiMean: number; // ms
  ikiStdDev: number; // ms
}

export interface BotKeystroke {
  char: string;
  timestamp: number;
  isCorrect: boolean;
  isBackspace: boolean;
}

export interface BotState {
  config: BotConfig;
  targetText: string;
  typedText: string;
  cursorIndex: number;
  keystrokes: BotKeystroke[];
  startTime: number;
  currentWpm: number;
  progress: number;
  isFinished: boolean;
  correctChars: number;
}

// Bot configurations by level
export const BOT_CONFIGS: Record<BotLevel, BotConfig> = {
  beginner: {
    level: 'beginner',
    targetWpmMean: 30,
    targetWpmStdDev: 8,
    mistakeProbability: 0.12, // 8-18% -> 12% mean
    correctionDelay: [300, 800],
    burstProbability: 0.1,
    hesitationProbability: 0.2,
    ikiMean: 400, // ~30 WPM
    ikiStdDev: 120,
  },
  intermediate: {
    level: 'intermediate',
    targetWpmMean: 50,
    targetWpmStdDev: 10,
    mistakeProbability: 0.07, // 4-10% -> 7% mean
    correctionDelay: [200, 500],
    burstProbability: 0.2,
    hesitationProbability: 0.1,
    ikiMean: 240, // ~50 WPM
    ikiStdDev: 60,
  },
  pro: {
    level: 'pro',
    targetWpmMean: 82,
    targetWpmStdDev: 12,
    mistakeProbability: 0.025, // 1-4% -> 2.5% mean
    correctionDelay: [100, 300],
    burstProbability: 0.35,
    hesitationProbability: 0.05,
    ikiMean: 146, // ~82 WPM
    ikiStdDev: 35,
  },
};

/**
 * Sample from log-normal distribution for natural keystroke timing
 */
function sampleLogNormal(mean: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Convert to log-normal
  const mu = Math.log(mean * mean / Math.sqrt(mean * mean + stdDev * stdDev));
  const sigma = Math.sqrt(Math.log(1 + (stdDev * stdDev) / (mean * mean)));
  
  return Math.exp(mu + sigma * z);
}

/**
 * Sample from normal distribution
 */
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

/**
 * Get adjacent keys for realistic typo simulation
 */
const ADJACENT_KEYS: Record<string, string[]> = {
  'a': ['q', 'w', 's', 'z'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'x', 'c'],
  'e': ['w', 's', 'd', 'r'],
  'f': ['d', 'r', 't', 'g', 'c', 'v'],
  'g': ['f', 't', 'y', 'h', 'v', 'b'],
  'h': ['g', 'y', 'u', 'j', 'b', 'n'],
  'i': ['u', 'j', 'k', 'o'],
  'j': ['h', 'u', 'i', 'k', 'n', 'm'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p'],
  'p': ['o', 'l'],
  'q': ['w', 'a'],
  'r': ['e', 'd', 'f', 't'],
  's': ['a', 'w', 'e', 'd', 'z', 'x'],
  't': ['r', 'f', 'g', 'y'],
  'u': ['y', 'h', 'j', 'i'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u'],
  'z': ['a', 's', 'x'],
  ' ': ['c', 'v', 'b', 'n', 'm'],
};

/**
 * Get a realistic typo character
 */
function getTypoChar(expectedChar: string): string {
  const lowerChar = expectedChar.toLowerCase();
  const adjacent = ADJACENT_KEYS[lowerChar];
  
  if (adjacent && adjacent.length > 0) {
    const typo = adjacent[Math.floor(Math.random() * adjacent.length)];
    // Preserve case
    return expectedChar === expectedChar.toUpperCase() ? typo.toUpperCase() : typo;
  }
  
  // Fallback: random nearby ASCII char
  const offset = Math.random() > 0.5 ? 1 : -1;
  return String.fromCharCode(expectedChar.charCodeAt(0) + offset);
}

/**
 * Create a new bot instance
 */
export function createBot(level: BotLevel, targetText: string): BotState {
  const config = { ...BOT_CONFIGS[level] };
  
  // Add some variance to make each bot unique
  config.targetWpmMean = Math.round(sampleNormal(config.targetWpmMean, config.targetWpmStdDev / 2));
  config.mistakeProbability = Math.max(0.01, Math.min(0.25, 
    config.mistakeProbability + (Math.random() - 0.5) * 0.05
  ));
  
  return {
    config,
    targetText,
    typedText: '',
    cursorIndex: 0,
    keystrokes: [],
    startTime: 0,
    currentWpm: 0,
    progress: 0,
    isFinished: false,
    correctChars: 0,
  };
}

/**
 * Generate next keystroke timing for bot
 */
export function getNextKeystrokeDelay(bot: BotState): number {
  const { config } = bot;
  
  // Base delay from log-normal distribution
  let delay = sampleLogNormal(config.ikiMean, config.ikiStdDev);
  
  // Hesitation (think pause)
  if (Math.random() < config.hesitationProbability) {
    delay += sampleLogNormal(500, 200);
  }
  
  // Burst typing (faster)
  if (Math.random() < config.burstProbability) {
    delay *= 0.6;
  }
  
  // Clamp to reasonable values
  return Math.max(50, Math.min(2000, delay));
}

/**
 * Simulate a single keystroke
 */
export function simulateKeystroke(bot: BotState, currentTime: number): BotState {
  if (bot.isFinished) return bot;
  
  const newBot = { ...bot };
  
  // Set start time on first keystroke
  if (newBot.keystrokes.length === 0) {
    newBot.startTime = currentTime;
  }
  
  const expectedChar = newBot.targetText[newBot.cursorIndex];
  if (!expectedChar) {
    newBot.isFinished = true;
    return newBot;
  }
  
  // Determine if this keystroke is a mistake
  const isMistake = Math.random() < newBot.config.mistakeProbability;
  
  let typedChar = expectedChar;
  if (isMistake) {
    typedChar = getTypoChar(expectedChar);
  }
  
  // Record keystroke
  const keystroke: BotKeystroke = {
    char: typedChar,
    timestamp: currentTime,
    isCorrect: typedChar === expectedChar,
    isBackspace: false,
  };
  
  newBot.keystrokes = [...newBot.keystrokes, keystroke];
  newBot.typedText += typedChar;
  newBot.cursorIndex++;
  
  if (keystroke.isCorrect) {
    newBot.correctChars++;
  }
  
  // If mistake was made, simulate correction pattern
  if (isMistake && Math.random() > 0.1) { // 90% chance to correct
    // Add backspace after delay
    const correctionDelay = newBot.config.correctionDelay[0] + 
      Math.random() * (newBot.config.correctionDelay[1] - newBot.config.correctionDelay[0]);
    
    const backspaceKeystroke: BotKeystroke = {
      char: '',
      timestamp: currentTime + correctionDelay,
      isCorrect: false,
      isBackspace: true,
    };
    
    newBot.keystrokes = [...newBot.keystrokes, backspaceKeystroke];
    newBot.typedText = newBot.typedText.slice(0, -1);
    newBot.cursorIndex--;
    
    // Retype correct character
    const retypeKeystroke: BotKeystroke = {
      char: expectedChar,
      timestamp: currentTime + correctionDelay + sampleLogNormal(100, 30),
      isCorrect: true,
      isBackspace: false,
    };
    
    newBot.keystrokes = [...newBot.keystrokes, retypeKeystroke];
    newBot.typedText += expectedChar;
    newBot.cursorIndex++;
    newBot.correctChars++;
  }
  
  // Calculate current WPM
  const elapsedMs = currentTime - newBot.startTime;
  newBot.currentWpm = calculateWpm(newBot.correctChars, elapsedMs);
  
  // Calculate progress
  newBot.progress = calculateProgress(newBot.correctChars, newBot.targetText.length);
  
  // Check if finished
  if (newBot.cursorIndex >= newBot.targetText.length) {
    newBot.isFinished = true;
  }
  
  return newBot;
}

/**
 * Run full bot simulation and return timeline of updates
 * Used for server-side bot execution
 */
export interface BotUpdate {
  timestamp: number;
  progress: number;
  wpm: number;
  typedText: string;
}

export function simulateFullRace(
  level: BotLevel,
  targetText: string,
  updateIntervalMs: number = 200
): BotUpdate[] {
  let bot = createBot(level, targetText);
  const updates: BotUpdate[] = [];
  let currentTime = 0;
  let nextUpdateTime = 0;
  
  while (!bot.isFinished) {
    // Simulate keystroke
    const delay = getNextKeystrokeDelay(bot);
    currentTime += delay;
    bot = simulateKeystroke(bot, currentTime);
    
    // Record update at interval
    if (currentTime >= nextUpdateTime) {
      updates.push({
        timestamp: currentTime,
        progress: bot.progress,
        wpm: bot.currentWpm,
        typedText: bot.typedText,
      });
      nextUpdateTime += updateIntervalMs;
    }
  }
  
  // Final update
  updates.push({
    timestamp: currentTime,
    progress: 100,
    wpm: bot.currentWpm,
    typedText: bot.typedText,
  });
  
  return updates;
}

/**
 * Get bot display name based on level
 */
export function getBotName(level: BotLevel): string {
  const names: Record<BotLevel, string[]> = {
    beginner: ['TypeLearner', 'KeyNewbie', 'SlowTyper', 'Novice123'],
    intermediate: ['SwiftKeys', 'TyperMike', 'KeyboardKid', 'MidRacer'],
    pro: ['SpeedDemon', 'TypeMaster', 'KeyboardKing', 'WPMChamp'],
  };
  
  const levelNames = names[level];
  return levelNames[Math.floor(Math.random() * levelNames.length)];
}

/**
 * Get expected completion time for a bot
 */
export function getExpectedCompletionTime(level: BotLevel, textLength: number): number {
  const config = BOT_CONFIGS[level];
  // Average chars per minute based on WPM (5 chars = 1 word)
  const charsPerMinute = config.targetWpmMean * 5;
  const charsPerMs = charsPerMinute / 60000;
  
  // Add buffer for mistakes and corrections
  const mistakeOverhead = 1 + (config.mistakeProbability * 2);
  
  return Math.round(textLength / charsPerMs * mistakeOverhead);
}
