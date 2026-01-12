export interface TypingStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  errors: number;
  elapsedTime: number;
  consistency: number;
}

export interface CharacterState {
  char: string;
  state: 'correct' | 'incorrect' | 'current' | 'upcoming';
  typed?: string;
}

export function calculateWPM(correctChars: number, elapsedTimeSeconds: number): number {
  if (elapsedTimeSeconds === 0) return 0;
  // Standard: 5 characters = 1 word
  const words = correctChars / 5;
  const minutes = elapsedTimeSeconds / 60;
  return Math.round(words / minutes);
}

export function calculateRawWPM(totalChars: number, elapsedTimeSeconds: number): number {
  if (elapsedTimeSeconds === 0) return 0;
  const words = totalChars / 5;
  const minutes = elapsedTimeSeconds / 60;
  return Math.round(words / minutes);
}

export function calculateAccuracy(correctChars: number, totalChars: number): number {
  if (totalChars === 0) return 100;
  return Math.round((correctChars / totalChars) * 100);
}

export function calculateConsistency(wpmHistory: number[]): number {
  if (wpmHistory.length < 2) return 100;
  
  const mean = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
  const variance = wpmHistory.reduce((sum, wpm) => sum + Math.pow(wpm - mean, 2), 0) / wpmHistory.length;
  const stdDev = Math.sqrt(variance);
  
  // Convert to a 0-100 scale where lower variance = higher consistency
  const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - coefficientOfVariation)));
}

export function getCharacterStates(
  targetText: string,
  typedText: string,
  currentIndex: number
): CharacterState[] {
  const states: CharacterState[] = [];
  
  for (let i = 0; i < targetText.length; i++) {
    const targetChar = targetText[i];
    const typedChar = typedText[i];
    
    let state: CharacterState['state'];
    
    if (i < typedText.length) {
      state = typedChar === targetChar ? 'correct' : 'incorrect';
    } else if (i === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    
    states.push({
      char: targetChar,
      state,
      typed: typedChar
    });
  }
  
  return states;
}

export function getInitialStats(): TypingStats {
  return {
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    errors: 0,
    elapsedTime: 0,
    consistency: 100
  };
}

export interface TestResult {
  id: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  mode: string;
  duration: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  errors: number;
  date: string;
  wpmHistory: number[];
}

export function saveTestResult(result: TestResult): void {
  const history = getTestHistory();
  history.unshift(result);
  // Keep last 100 results
  if (history.length > 100) {
    history.pop();
  }
  localStorage.setItem('typingmaster_history', JSON.stringify(history));
}

export function getTestHistory(): TestResult[] {
  const stored = localStorage.getItem('typingmaster_history');
  return stored ? JSON.parse(stored) : [];
}

export function getPersonalBest(): { wpm: number; accuracy: number } | null {
  const history = getTestHistory();
  if (history.length === 0) return null;
  
  const bestWpm = Math.max(...history.map(r => r.wpm));
  const bestAccuracy = Math.max(...history.map(r => r.accuracy));
  
  return { wpm: bestWpm, accuracy: bestAccuracy };
}
