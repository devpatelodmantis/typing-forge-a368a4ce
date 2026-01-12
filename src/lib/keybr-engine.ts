/**
 * KEYBR-STYLE ADAPTIVE LEARNING ENGINE
 * Per-character metrics, confidence levels, and intelligent letter unlocking
 */

// Character confidence data structure
export interface CharacterConfidence {
  char: string;
  confidence: number; // 0.0 to 1.0+
  wpm: number;
  accuracy: number;
  occurrences: number;
  avgTimeMs: number;
  stdDev: number;
  isUnlocked: boolean;
  status: 'weak' | 'needs_work' | 'in_progress' | 'nearly_unlocked' | 'unlocked';
}

export interface Keystroke {
  char: string;
  timestamp: number;
  isCorrect: boolean;
  expected: string;
}

export interface KeybrLesson {
  text: string;
  availableLetters: string[];
  focusLetters: string[];
  lockedLetters: string[];
}

// Default starting letters (vowels + common consonants)
const STARTING_LETTERS = new Set(['e', 't', 'a', 'o', 'i', 'n', 's', 'r']);
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Letter frequency order (most common to least common in English)
const LETTER_FREQUENCY_ORDER = [
  'e', 't', 'a', 'o', 'i', 'n', 's', 'h', 'r', 'd', 'l', 'c', 'u', 'm', 'w',
  'f', 'g', 'y', 'p', 'b', 'v', 'k', 'j', 'x', 'q', 'z'
];

/**
 * Calculate per-character metrics from keystrokes
 */
export function calculatePerCharMetrics(
  keystrokes: Keystroke[],
  targetWPM: number = 35
): Map<string, CharacterConfidence> {
  const charMap = new Map<string, {
    correct: number;
    total: number;
    timings: number[];
  }>();

  // Group keystrokes by character
  for (let i = 0; i < keystrokes.length; i++) {
    const ks = keystrokes[i];
    const char = ks.expected.toLowerCase();
    
    if (!char.match(/[a-z]/)) continue; // Only track letters
    
    if (!charMap.has(char)) {
      charMap.set(char, { correct: 0, total: 0, timings: [] });
    }
    
    const data = charMap.get(char)!;
    data.total++;
    if (ks.isCorrect) data.correct++;
    
    // Calculate time since previous keystroke (bigram timing)
    if (i > 0) {
      const timeDiff = ks.timestamp - keystrokes[i - 1].timestamp;
      if (timeDiff > 0 && timeDiff < 5000) { // Ignore pauses > 5s
        data.timings.push(timeDiff);
      }
    }
  }

  // Convert to CharacterConfidence
  const result = new Map<string, CharacterConfidence>();
  const savedData = getCharacterData();

  for (const [char, data] of charMap) {
    const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    const avgTimeMs = data.timings.length > 0 
      ? data.timings.reduce((a, b) => a + b, 0) / data.timings.length 
      : 500;
    const stdDev = calculateStdDev(data.timings);
    
    // Calculate WPM for this character: 60000ms/min ÷ avg_time ÷ 5 chars/word
    const charWPM = avgTimeMs > 0 ? (60000 / avgTimeMs) / 5 : 0;
    
    // Confidence = (speed component) × (accuracy component) × (consistency multiplier)
    const speedComponent = Math.min(charWPM / targetWPM, 1.0);
    const accuracyComponent = accuracy / 100;
    const consistencyMult = Math.max(0, 1 - (stdDev / 200));
    const confidence = speedComponent * accuracyComponent * consistencyMult;
    
    const isUnlocked = savedData[char]?.isUnlocked || STARTING_LETTERS.has(char);
    
    result.set(char, {
      char,
      confidence: Math.round(confidence * 100) / 100,
      wpm: Math.round(charWPM * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      occurrences: data.total,
      avgTimeMs: Math.round(avgTimeMs),
      stdDev: Math.round(stdDev),
      isUnlocked,
      status: getConfidenceStatus(confidence, isUnlocked).status
    });
  }

  return result;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Get confidence status with color and emoji
 */
export function getConfidenceStatus(confidence: number, isUnlocked: boolean = true): {
  status: 'weak' | 'needs_work' | 'in_progress' | 'nearly_unlocked' | 'unlocked';
  color: string;
  emoji: string;
  text: string;
} {
  if (!isUnlocked) {
    return { status: 'weak', color: 'gray', emoji: '🔒', text: 'Locked' };
  }
  if (confidence >= 1.0) {
    return { status: 'unlocked', color: 'success', emoji: '✅', text: 'Mastered' };
  }
  if (confidence >= 0.8) {
    return { status: 'nearly_unlocked', color: 'primary', emoji: '🟢', text: 'Nearly there' };
  }
  if (confidence >= 0.6) {
    return { status: 'in_progress', color: 'warning', emoji: '🟡', text: 'In progress' };
  }
  if (confidence >= 0.3) {
    return { status: 'needs_work', color: 'warning', emoji: '🟠', text: 'Needs work' };
  }
  return { status: 'weak', color: 'destructive', emoji: '🔴', text: 'Weak' };
}

/**
 * Get/save character confidence data from localStorage
 */
export function getCharacterData(): Record<string, CharacterConfidence> {
  const stored = localStorage.getItem('keybr_character_data');
  return stored ? JSON.parse(stored) : {};
}

export function saveCharacterData(data: Record<string, CharacterConfidence>): void {
  localStorage.setItem('keybr_character_data', JSON.stringify(data));
}

/**
 * Update character data with new test results
 */
export function updateCharacterProgress(
  newMetrics: Map<string, CharacterConfidence>,
  targetWPM: number = 35
): {
  updatedChars: CharacterConfidence[];
  newlyUnlocked: string[];
  nextToUnlock: string | null;
} {
  const savedData = getCharacterData();
  const updatedChars: CharacterConfidence[] = [];
  const newlyUnlocked: string[] = [];

  // Merge new metrics with saved data
  for (const [char, metrics] of newMetrics) {
    const existing = savedData[char];
    
    // Calculate weighted average if existing data
    let newConfidence = metrics.confidence;
    let newWpm = metrics.wpm;
    let newAccuracy = metrics.accuracy;
    let totalOccurrences = metrics.occurrences;
    
    if (existing) {
      const weight = 0.7; // Give more weight to recent results
      newConfidence = existing.confidence * (1 - weight) + metrics.confidence * weight;
      newWpm = existing.wpm * (1 - weight) + metrics.wpm * weight;
      newAccuracy = existing.accuracy * (1 - weight) + metrics.accuracy * weight;
      totalOccurrences = existing.occurrences + metrics.occurrences;
    }
    
    const wasUnlocked = existing?.isUnlocked || STARTING_LETTERS.has(char);
    const shouldUnlock = newWpm >= targetWPM && newAccuracy >= 95;
    const isUnlocked = wasUnlocked || shouldUnlock;
    
    if (!wasUnlocked && shouldUnlock) {
      newlyUnlocked.push(char);
    }
    
    const updated: CharacterConfidence = {
      char,
      confidence: Math.round(newConfidence * 100) / 100,
      wpm: Math.round(newWpm * 10) / 10,
      accuracy: Math.round(newAccuracy * 10) / 10,
      occurrences: totalOccurrences,
      avgTimeMs: metrics.avgTimeMs,
      stdDev: metrics.stdDev,
      isUnlocked,
      status: getConfidenceStatus(newConfidence, isUnlocked).status
    };
    
    savedData[char] = updated;
    updatedChars.push(updated);
  }

  saveCharacterData(savedData);

  return {
    updatedChars,
    newlyUnlocked,
    nextToUnlock: getNextLetterToUnlock(savedData)
  };
}

/**
 * Get the next letter that should be unlocked
 */
function getNextLetterToUnlock(data: Record<string, CharacterConfidence>): string | null {
  for (const letter of LETTER_FREQUENCY_ORDER) {
    if (!data[letter]?.isUnlocked && !STARTING_LETTERS.has(letter)) {
      return letter;
    }
  }
  return null;
}

/**
 * Get all unlocked letters
 */
export function getUnlockedLetters(): string[] {
  const data = getCharacterData();
  const unlocked = new Set<string>(STARTING_LETTERS);
  
  for (const [char, charData] of Object.entries(data)) {
    if (charData.isUnlocked) {
      unlocked.add(char);
    }
  }
  
  return Array.from(unlocked).sort();
}

/**
 * Get locked letters
 */
export function getLockedLetters(): string[] {
  const unlocked = new Set(getUnlockedLetters());
  return ALL_LETTERS.filter(l => !unlocked.has(l));
}

/**
 * Get weak letters (lowest confidence among unlocked)
 */
export function getWeakLetters(count: number = 5): string[] {
  const data = getCharacterData();
  const unlocked = getUnlockedLetters();
  
  return unlocked
    .map(char => ({ char, confidence: data[char]?.confidence || 0 }))
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, count)
    .map(x => x.char);
}

/**
 * Generate Keybr-style adaptive lesson
 */
export function generateKeybrLesson(wordCount: number = 50): KeybrLesson {
  const unlockedLetters = getUnlockedLetters();
  const lockedLetters = getLockedLetters();
  const focusLetters = getWeakLetters(3);
  
  // Word bank filtered by available letters
  const wordBank = getWordBank().filter(word => {
    const wordLetters = new Set(word.toLowerCase().replace(/[^a-z]/g, '').split(''));
    for (const char of wordLetters) {
      if (!unlockedLetters.includes(char)) {
        return false;
      }
    }
    return true;
  });
  
  // Prioritize words with focus letters
  const focusWords = wordBank.filter(word => 
    focusLetters.some(char => word.includes(char))
  );
  const otherWords = wordBank.filter(word => 
    !focusLetters.some(char => word.includes(char))
  );
  
  // Mix: 70% focus words, 30% other
  const focusCount = Math.ceil(wordCount * 0.7);
  const otherCount = wordCount - focusCount;
  
  const selectedWords: string[] = [];
  
  // Add focus words
  for (let i = 0; i < focusCount && focusWords.length > 0; i++) {
    const idx = Math.floor(Math.random() * focusWords.length);
    selectedWords.push(focusWords[idx]);
  }
  
  // Add other words
  for (let i = 0; i < otherCount && otherWords.length > 0; i++) {
    const idx = Math.floor(Math.random() * otherWords.length);
    selectedWords.push(otherWords[idx]);
  }
  
  // Shuffle
  for (let i = selectedWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedWords[i], selectedWords[j]] = [selectedWords[j], selectedWords[i]];
  }
  
  return {
    text: selectedWords.slice(0, wordCount).join(' '),
    availableLetters: unlockedLetters,
    focusLetters,
    lockedLetters
  };
}

/**
 * Get word bank for Keybr lessons
 */
function getWordBank(): string[] {
  return [
    // Common short words
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
    'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
    'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
    'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
    'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
    'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'into',
    'year', 'your', 'good', 'some', 'them', 'see', 'other', 'than', 'then', 'now',
    'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use',
    'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want',
    'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has', 'had',
    // Medium words  
    'state', 'never', 'before', 'high', 'every', 'same', 'under', 'last', 'great', 'own',
    'little', 'still', 'world', 'life', 'home', 'read', 'hand', 'between', 'each', 'made',
    'next', 'sound', 'below', 'saw', 'house', 'again', 'side', 'large', 'three', 'small',
    'part', 'live', 'found', 'upon', 'right', 'left', 'line', 'turn', 'move', 'must',
    'name', 'kind', 'need', 'place', 'long', 'old', 'help', 'mean', 'might', 'end',
    'different', 'around', 'animal', 'point', 'mother', 'answer', 'learn', 'study', 'father', 'head',
    'stand', 'page', 'earth', 'letter', 'thought', 'together', 'until', 'children', 'begin', 'idea',
    'enough', 'almost', 'above', 'sometimes', 'mountain', 'paper', 'example', 'hundred', 'thousand', 'second'
  ];
}

/**
 * Get all character stats for display
 */
export function getAllCharacterStats(): CharacterConfidence[] {
  const data = getCharacterData();
  
  return ALL_LETTERS.map(char => {
    const existing = data[char];
    const isUnlocked = existing?.isUnlocked || STARTING_LETTERS.has(char);
    
    return existing || {
      char,
      confidence: 0,
      wpm: 0,
      accuracy: 0,
      occurrences: 0,
      avgTimeMs: 0,
      stdDev: 0,
      isUnlocked,
      status: isUnlocked ? 'weak' : 'weak'
    };
  });
}

/**
 * Reset all Keybr progress
 */
export function resetKeybrProgress(): void {
  localStorage.removeItem('keybr_character_data');
}
