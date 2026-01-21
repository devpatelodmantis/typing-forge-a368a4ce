/**
 * PROFESSIONAL ACCURACY CALCULATOR
 * Generates detailed accuracy report with keystroke-level analysis
 */

export interface Keystroke {
  key: string;
  char: string;
  timestamp: number;
  position: number;
  expected?: string;
  isCorrect?: boolean;
}

export interface CharComparison {
  position: number;
  typedChar: string | null;
  targetChar: string | null;
  status: 'CORRECT' | 'INCORRECT' | 'MISSED' | 'EXTRA' | 'UNTYPED';
  errorType: string | null;
}

export interface ErrorAnalysis {
  typos: Array<{ position: number; expected: string; typed: string; similarity: number }>;
  misses: Array<{ position: number; expectedChar: string }>;
  extras: Array<{ position: number; extraChar: string }>;
  totalErrors: number;
  errorRate: number;
}

export interface CharTypeDistribution {
  letters: { correct: number; incorrect: number; accuracy: number };
  numbers: { correct: number; incorrect: number; accuracy: number };
  spaces: { correct: number; incorrect: number; accuracy: number };
  punctuation: { correct: number; incorrect: number; accuracy: number };
}

export interface KeystrokeIntervals {
  average: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
}

export interface SkillAssessment {
  skillLevel: 'LEARNING' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
  overallRating: number;
  strengths: string[];
  improvements: string[];
}

export interface ProfessionalAccuracyReport {
  // Overview
  overview: {
    accuracy: number;
    wpm: number;
    netWpm: number;
    rawWpm: number;
    consistency: number;
    duration: number;
    timestamp: string;
  };

  // Detailed Accuracy
  accuracy: {
    typed: number;
    target: number;
    adjusted: number;
    final: number;
    correctChars: number;
    incorrectChars: number;
    extraChars: number;
    missedChars: number;
    totalTargetChars: number;
    backspaceUsed: boolean;
    backspaceCount: number;
  };

  // Typing Metrics
  typing: {
    totalCharsTyped: number;
    totalKeystrokes: number;
    backspaceCount: number;
    backspacePercentage: number;
    wpm: number;
    rawWpm: number;
    netWpm: number;
    charsPerSecond: number;
  };

  // Error Analysis
  errors: ErrorAnalysis;

  // Character Type Distribution
  distribution: CharTypeDistribution;

  // Consistency Analysis
  consistency: {
    score: number;
    keystrokeIntervals: KeystrokeIntervals;
    peakWpm: number;
    lowestWpm: number;
    consistencyLevel: string;
  };

  // Skill Assessment
  assessment: SkillAssessment;

  // Character-by-character detail
  charComparison: CharComparison[];
}

// Keyboard adjacency map for similarity scoring
const ADJACENT_KEYS: Record<string, string[]> = {
  'q': ['w', 'a'],
  'w': ['q', 'e', 's', 'a'],
  'e': ['w', 'r', 'd', 's'],
  'r': ['e', 't', 'f', 'd'],
  't': ['r', 'y', 'g', 'f'],
  'y': ['t', 'u', 'h', 'g'],
  'u': ['y', 'i', 'j', 'h'],
  'i': ['u', 'o', 'k', 'j'],
  'o': ['i', 'p', 'l', 'k'],
  'p': ['o', 'l'],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'z', 'x'],
  'd': ['s', 'e', 'r', 'f', 'x', 'c'],
  'f': ['d', 'r', 't', 'g', 'c', 'v'],
  'g': ['f', 't', 'y', 'h', 'v', 'b'],
  'h': ['g', 'y', 'u', 'j', 'b', 'n'],
  'j': ['h', 'u', 'i', 'k', 'n', 'm'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'z': ['a', 's', 'x'],
  'x': ['z', 's', 'd', 'c'],
  'c': ['x', 'd', 'f', 'v'],
  'v': ['c', 'f', 'g', 'b'],
  'b': ['v', 'g', 'h', 'n'],
  'n': ['b', 'h', 'j', 'm'],
  'm': ['n', 'j', 'k'],
};

function calculateCharSimilarity(char1: string, char2: string): number {
  if (char1 === char2) return 100;
  
  const c1 = char1.toLowerCase();
  const c2 = char2.toLowerCase();
  
  // Check case difference
  if (c1 === c2) return 85;
  
  // Check keyboard adjacency
  if (ADJACENT_KEYS[c1]?.includes(c2) || ADJACENT_KEYS[c2]?.includes(c1)) {
    return 70;
  }
  
  return 0;
}

function getCharType(char: string): 'letters' | 'numbers' | 'spaces' | 'punctuation' {
  if (/[a-zA-Z]/.test(char)) return 'letters';
  if (/[0-9]/.test(char)) return 'numbers';
  if (char === ' ') return 'spaces';
  return 'punctuation';
}

function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

export function generateProfessionalAccuracyReport(
  targetText: string,
  typedText: string,
  keystrokeLog: Keystroke[],
  durationSeconds: number,
  backspaceCount: number,
  wpmHistory: number[]
): ProfessionalAccuracyReport {
  // Use the shorter length for comparison (what was actually typed vs what was expected)
  const comparisonLength = Math.min(typedText.length, targetText.length);
  const maxLength = Math.max(typedText.length, targetText.length);
  const charComparison: CharComparison[] = [];
  
  // Character type distribution
  const distribution: CharTypeDistribution = {
    letters: { correct: 0, incorrect: 0, accuracy: 0 },
    numbers: { correct: 0, incorrect: 0, accuracy: 0 },
    spaces: { correct: 0, incorrect: 0, accuracy: 0 },
    punctuation: { correct: 0, incorrect: 0, accuracy: 0 },
  };
  
  // Calculate character-by-character comparison
  let correctChars = 0;
  let incorrectChars = 0;
  let extraChars = 0;
  let missedChars = 0;
  
  // First, compare what was typed against the target
  for (let i = 0; i < comparisonLength; i++) {
    const typedChar = typedText[i];
    const targetChar = targetText[i];
    
    let status: CharComparison['status'] = 'UNTYPED';
    let errorType: string | null = null;
    
    if (typedChar === targetChar) {
      status = 'CORRECT';
      correctChars++;
      const charType = getCharType(targetChar);
      distribution[charType].correct++;
    } else {
      status = 'INCORRECT';
      errorType = 'TYPO';
      incorrectChars++;
      const charType = getCharType(targetChar);
      distribution[charType].incorrect++;
    }
    
    charComparison.push({
      position: i,
      typedChar,
      targetChar,
      status,
      errorType,
    });
  }
  
  // Handle extra characters (typed more than target)
  for (let i = comparisonLength; i < typedText.length; i++) {
    extraChars++;
    charComparison.push({
      position: i,
      typedChar: typedText[i],
      targetChar: null,
      status: 'EXTRA',
      errorType: 'EXTRA_CHAR',
    });
  }
  
  // Handle missed characters (target longer than typed)
  for (let i = comparisonLength; i < targetText.length; i++) {
    missedChars++;
    const targetChar = targetText[i];
    const charType = getCharType(targetChar);
    distribution[charType].incorrect++;
    charComparison.push({
      position: i,
      typedChar: null,
      targetChar,
      status: 'MISSED',
      errorType: 'MISSED_CHAR',
    });
  }
  
  // Calculate distribution accuracies
  Object.keys(distribution).forEach((key) => {
    const type = key as keyof CharTypeDistribution;
    const total = distribution[type].correct + distribution[type].incorrect;
    distribution[type].accuracy = total > 0 
      ? Math.round((distribution[type].correct / total) * 10000) / 100 
      : 100;
  });
  
  // Calculate accuracy percentages - CRITICAL FIX
  const totalTypedChars = typedText.length;
  const totalTargetChars = targetText.length;
  
  // Primary accuracy: based on what was typed (correct / total typed)
  // This is the standard typing test accuracy formula
  const typedAccuracy = totalTypedChars > 0 
    ? (correctChars / totalTypedChars) * 100 
    : 0;
  
  // Target-based accuracy (how much of target was correct)
  const targetAccuracy = totalTargetChars > 0 
    ? (correctChars / totalTargetChars) * 100 
    : 0;
  
  // For completed tests, use typed accuracy (correct / total typed)
  // This matches MonkeyType behavior: accuracy = correct keystrokes / total keystrokes
  let finalAccuracy = Math.round(typedAccuracy * 100) / 100;
  
  // Cap at 99.99% if backspace was used (per memory: strict accuracy enforcement)
  if (backspaceCount > 0 && finalAccuracy >= 100) {
    finalAccuracy = 99.99;
  }
  
  // Adjusted accuracy for detailed reporting
  const adjustedAccuracy = totalTypedChars > 0 
    ? Math.max(0, ((correctChars) / totalTypedChars) * 100)
    : 0;
  
  // Analyze errors
  const errors: ErrorAnalysis = {
    typos: [],
    misses: [],
    extras: [],
    totalErrors: 0,
    errorRate: 0,
  };
  
  charComparison.forEach((char) => {
    if (char.status === 'INCORRECT' && char.typedChar && char.targetChar) {
      errors.typos.push({
        position: char.position,
        expected: char.targetChar,
        typed: char.typedChar,
        similarity: calculateCharSimilarity(char.typedChar, char.targetChar),
      });
      errors.totalErrors++;
    } else if (char.status === 'MISSED' && char.targetChar) {
      errors.misses.push({
        position: char.position,
        expectedChar: char.targetChar,
      });
      errors.totalErrors++;
    } else if (char.status === 'EXTRA' && char.typedChar) {
      errors.extras.push({
        position: char.position,
        extraChar: char.typedChar,
      });
      errors.totalErrors++;
    }
  });
  
  errors.errorRate = totalTargetChars > 0 
    ? Math.round((errors.totalErrors / totalTargetChars) * 10000) / 100 
    : 0;
  
  // Calculate keystroke intervals
  const intervals: number[] = [];
  for (let i = 1; i < keystrokeLog.length; i++) {
    intervals.push(keystrokeLog[i].timestamp - keystrokeLog[i - 1].timestamp);
  }
  
  const keystrokeIntervals: KeystrokeIntervals = {
    average: intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0,
    min: intervals.length > 0 ? Math.round(Math.min(...intervals)) : 0,
    max: intervals.length > 0 ? Math.round(Math.max(...intervals)) : 0,
    median: Math.round(calculateMedian(intervals)),
    stdDev: Math.round(calculateStdDev(intervals)),
  };
  
  // Calculate consistency score based on WPM variance (like MonkeyType)
  // This measures how consistent the typing speed is, not keystroke intervals
  let consistencyScore = 100;
  if (wpmHistory.length > 1) {
    const validWpms = wpmHistory.filter(w => w > 0);
    if (validWpms.length > 1) {
      const meanWpm = validWpms.reduce((a, b) => a + b, 0) / validWpms.length;
      const wpmVariance = validWpms.reduce((sum, val) => sum + Math.pow(val - meanWpm, 2), 0) / validWpms.length;
      const wpmStdDev = Math.sqrt(wpmVariance);
      // Coefficient of variation for WPM
      const wpmCV = meanWpm > 0 ? (wpmStdDev / meanWpm) * 100 : 0;
      // Convert to 0-100 score where 100 = perfectly consistent
      // Cap the CV effect at 100% (would give 0 consistency)
      consistencyScore = Math.max(0, Math.round(100 - Math.min(wpmCV, 100)));
    }
  } else if (keystrokeIntervals.average > 0) {
    // Fallback to keystroke interval consistency if no WPM history
    const coefficientOfVariation = (keystrokeIntervals.stdDev / keystrokeIntervals.average) * 100;
    consistencyScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(coefficientOfVariation, 100))));
  }
  
  // Calculate WPM metrics
  const durationMinutes = durationSeconds / 60;
  const wpm = durationMinutes > 0 ? Math.round((correctChars / 5) / durationMinutes) : 0;
  const rawWpm = durationMinutes > 0 ? Math.round((totalTypedChars / 5) / durationMinutes) : 0;
  const netWpm = durationMinutes > 0 ? Math.round(((correctChars - incorrectChars) / 5) / durationMinutes) : 0;
  const charsPerSecond = durationSeconds > 0 ? Math.round((totalTypedChars / durationSeconds) * 100) / 100 : 0;
  
  // Peak and lowest WPM from history
  const peakWpm = wpmHistory.length > 0 ? Math.max(...wpmHistory) : wpm;
  const lowestWpm = wpmHistory.length > 0 ? Math.min(...wpmHistory.filter(w => w > 0)) : wpm;
  
  // Consistency level description
  const getConsistencyLevel = (score: number): string => {
    if (score >= 90) return 'EXCELLENT - Very consistent typing rhythm';
    if (score >= 75) return 'GOOD - Mostly consistent with minor variations';
    if (score >= 60) return 'MODERATE - Notable variations in speed';
    if (score >= 40) return 'FAIR - Significant speed fluctuations';
    return 'NEEDS WORK - Highly variable typing rhythm';
  };
  
  // Skill assessment
  const assessSkillLevel = (accuracy: number, wpmVal: number): SkillAssessment['skillLevel'] => {
    if (accuracy >= 98 && wpmVal >= 80) return 'PROFESSIONAL';
    if (accuracy >= 95 && wpmVal >= 60) return 'ADVANCED';
    if (accuracy >= 90 && wpmVal >= 40) return 'INTERMEDIATE';
    if (accuracy >= 85 && wpmVal >= 25) return 'BEGINNER';
    return 'LEARNING';
  };
  
  // Identify strengths
  const identifyStrengths = (): string[] => {
    const strengths: string[] = [];
    
    // Best character type
    let bestType = 'letters';
    let bestAcc = 0;
    Object.entries(distribution).forEach(([type, data]) => {
      if (data.accuracy > bestAcc && (data.correct + data.incorrect) > 0) {
        bestAcc = data.accuracy;
        bestType = type;
      }
    });
    
    if (bestAcc >= 98) {
      strengths.push(`Excellent ${bestType} typing (${bestAcc}% accuracy)`);
    }
    
    if (consistencyScore >= 80) {
      strengths.push(`Highly consistent typing rhythm (${consistencyScore}% consistency)`);
    }
    
    if (wpm >= 60) {
      strengths.push(`Fast typing speed (${wpm} WPM)`);
    }
    
    if (finalAccuracy >= 98) {
      strengths.push(`Outstanding accuracy (${finalAccuracy}%)`);
    }
    
    if (backspaceCount === 0 && incorrectChars === 0) {
      strengths.push('Perfect typing with no corrections needed');
    }
    
    return strengths.length > 0 ? strengths : ['Good effort! Keep practicing to improve.'];
  };
  
  // Identify improvements
  const identifyImprovements = (): string[] => {
    const improvements: string[] = [];
    
    // Worst character type
    let worstType: string | null = null;
    let worstAcc = 100;
    Object.entries(distribution).forEach(([type, data]) => {
      const total = data.correct + data.incorrect;
      if (total > 0 && data.accuracy < worstAcc && data.accuracy < 95) {
        worstAcc = data.accuracy;
        worstType = type;
      }
    });
    
    if (worstType) {
      improvements.push(`Focus on ${worstType} accuracy (currently ${worstAcc}%)`);
    }
    
    if (backspaceCount > totalTypedChars * 0.1) {
      improvements.push('Reduce corrections - aim for accuracy over speed initially');
    }
    
    if (consistencyScore < 70) {
      improvements.push('Work on maintaining a steady typing rhythm');
    }
    
    if (errors.typos.length > 3) {
      // Find common error patterns
      const commonErrors = errors.typos.slice(0, 3).map(e => `${e.typed}→${e.expected}`).join(', ');
      improvements.push(`Practice commonly mistyped keys: ${commonErrors}`);
    }
    
    if (wpm < 40 && finalAccuracy >= 95) {
      improvements.push('Great accuracy! Now focus on gradually increasing speed');
    }
    
    return improvements.length > 0 ? improvements : ['Keep up the great work!'];
  };
  
  // Calculate overall rating (0-100)
  const calculateOverallRating = (): number => {
    const accuracyScore = finalAccuracy * 0.45; // 45% weight
    const speedScore = Math.min(100, (wpm / 100) * 100) * 0.30; // 30% weight
    const consistencyScoreWeighted = consistencyScore * 0.25; // 25% weight
    
    return Math.round((accuracyScore + speedScore + consistencyScoreWeighted) * 10) / 10;
  };
  
  const skillLevel = assessSkillLevel(finalAccuracy, wpm);
  
  return {
    overview: {
      accuracy: finalAccuracy,
      wpm,
      netWpm: Math.max(0, netWpm),
      rawWpm,
      consistency: consistencyScore,
      duration: Math.round(durationSeconds * 100) / 100,
      timestamp: new Date().toISOString(),
    },
    accuracy: {
      typed: Math.round(typedAccuracy * 100) / 100,
      target: Math.round(targetAccuracy * 100) / 100,
      adjusted: Math.round(adjustedAccuracy * 100) / 100,
      final: finalAccuracy,
      correctChars,
      incorrectChars,
      extraChars,
      missedChars,
      totalTargetChars,
      backspaceUsed: backspaceCount > 0,
      backspaceCount,
    },
    typing: {
      totalCharsTyped: totalTypedChars,
      totalKeystrokes: keystrokeLog.length,
      backspaceCount,
      backspacePercentage: keystrokeLog.length > 0 
        ? Math.round((backspaceCount / keystrokeLog.length) * 10000) / 100 
        : 0,
      wpm,
      rawWpm,
      netWpm: Math.max(0, netWpm),
      charsPerSecond,
    },
    errors,
    distribution,
    consistency: {
      score: consistencyScore,
      keystrokeIntervals,
      peakWpm,
      lowestWpm,
      consistencyLevel: getConsistencyLevel(consistencyScore),
    },
    assessment: {
      skillLevel,
      overallRating: calculateOverallRating(),
      strengths: identifyStrengths(),
      improvements: identifyImprovements(),
    },
    charComparison,
  };
}

// Generate text report for console or export
export function generateTextReport(report: ProfessionalAccuracyReport): string {
  return `
╔════════════════════════════════════════════════════════════════╗
║         PROFESSIONAL TYPING TEST ACCURACY REPORT               ║
╚════════════════════════════════════════════════════════════════╝

📊 OVERVIEW METRICS
├─ Final Accuracy: ${report.overview.accuracy}%
├─ WPM: ${report.overview.wpm} (Raw: ${report.typing.rawWpm})
├─ Net WPM: ${report.overview.netWpm}
├─ Consistency: ${report.overview.consistency}%
└─ Duration: ${report.overview.duration}s

✅ ACCURACY BREAKDOWN
├─ Correct Characters: ${report.accuracy.correctChars}/${report.accuracy.totalTargetChars}
├─ Incorrect Characters: ${report.accuracy.incorrectChars}
├─ Missed Characters: ${report.accuracy.missedChars}
├─ Extra Characters: ${report.accuracy.extraChars}
├─ Error Rate: ${report.errors.errorRate}%
└─ Backspace Count: ${report.typing.backspaceCount} (${report.typing.backspacePercentage}%)

⌨️  TYPING METRICS
├─ Total Keystrokes: ${report.typing.totalKeystrokes}
├─ Total Chars Typed: ${report.typing.totalCharsTyped}
├─ Chars/Second: ${report.typing.charsPerSecond}
├─ Average Interval: ${report.consistency.keystrokeIntervals.average}ms
├─ Min/Max Interval: ${report.consistency.keystrokeIntervals.min}ms / ${report.consistency.keystrokeIntervals.max}ms
└─ Peak WPM: ${report.consistency.peakWpm}

❌ ERROR ANALYSIS
├─ Total Errors: ${report.errors.totalErrors}
├─ Typos: ${report.errors.typos.length}
├─ Missed Characters: ${report.errors.misses.length}
└─ Extra Characters: ${report.errors.extras.length}

📈 CHARACTER TYPE DISTRIBUTION
├─ Letters: ${report.distribution.letters.correct}/${report.distribution.letters.correct + report.distribution.letters.incorrect} (${report.distribution.letters.accuracy}%)
├─ Numbers: ${report.distribution.numbers.correct}/${report.distribution.numbers.correct + report.distribution.numbers.incorrect} (${report.distribution.numbers.accuracy}%)
├─ Spaces: ${report.distribution.spaces.correct}/${report.distribution.spaces.correct + report.distribution.spaces.incorrect} (${report.distribution.spaces.accuracy}%)
└─ Punctuation: ${report.distribution.punctuation.correct}/${report.distribution.punctuation.correct + report.distribution.punctuation.incorrect} (${report.distribution.punctuation.accuracy}%)

💪 SKILL ASSESSMENT
├─ Skill Level: ${report.assessment.skillLevel}
├─ Overall Rating: ${report.assessment.overallRating}/100
├─ Consistency Level: ${report.consistency.consistencyLevel}
│
├─ Strengths:
│  ${report.assessment.strengths.map(s => '✓ ' + s).join('\n│  ')}
│
└─ Areas for Improvement:
   ${report.assessment.improvements.map(i => '→ ' + i).join('\n   ')}

════════════════════════════════════════════════════════════════
Report Generated: ${report.overview.timestamp}
════════════════════════════════════════════════════════════════
`;
}
