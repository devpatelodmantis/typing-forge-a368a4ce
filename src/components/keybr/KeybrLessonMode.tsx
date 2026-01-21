import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RotateCcw, Sparkles, Zap } from 'lucide-react';
import { 
  generateKeybrLesson,
  calculatePerCharMetrics,
  updateCharacterProgress,
  type Keystroke,
  type KeybrLesson
} from '@/lib/keybr-engine';
import { calculateWPM, calculateAccuracy, calculateConsistency } from '@/lib/typing-engine';
import { LetterProgressPanel } from './LetterProgressPanel';
import { KeybrResults } from './KeybrResults';
import { KeyboardVisualizer } from '@/components/typing/KeyboardVisualizer';
import { useTestResults } from '@/hooks/useTestResults';

type TestStatus = 'idle' | 'running' | 'finished';

export function KeybrLessonMode() {
  const { saveResult, saveCharacterConfidence } = useTestResults();
  const [status, setStatus] = useState<TestStatus>('idle');
  const [lesson, setLesson] = useState<KeybrLesson | null>(null);
  const [typedText, setTypedText] = useState('');
  const [keystrokes, setKeystrokes] = useState<Keystroke[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const [isFocused, setIsFocused] = useState(false);
  const [showErrorFlash, setShowErrorFlash] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentKeyPressed, setCurrentKeyPressed] = useState<string | undefined>();
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  
  // Track backspace attempts (for logging, even though learn mode rejects them)
  const [backspaceAttempts, setBackspaceAttempts] = useState(0);
  
  // Word-level locking for learn mode too
  const [completedWordEndIndices, setCompletedWordEndIndices] = useState<number[]>([]);
  
  const [results, setResults] = useState<{
    wpm: number;
    accuracy: number;
    newlyUnlocked: string[];
    perCharMetrics: Map<string, any>;
  } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-calculate word boundaries
  const wordBoundaries = useMemo(() => {
    if (!lesson) return [];
    const boundaries: number[] = [];
    for (let i = 0; i < lesson.text.length; i++) {
      if (lesson.text[i] === ' ') {
        boundaries.push(i);
      }
    }
    return boundaries;
  }, [lesson]);

  // Generate lesson on mount
  useEffect(() => {
    generateNewLesson();
  }, []);

  const generateNewLesson = useCallback(() => {
    const newLesson = generateKeybrLesson(40);
    setLesson(newLesson);
    setTypedText('');
    setKeystrokes([]);
    setStatus('idle');
    setCurrentWpm(0);
    setCurrentAccuracy(100);
    setResults(null);
    setScrollOffset(0);
    setWpmHistory([]);
    setBackspaceAttempts(0);
    setCompletedWordEndIndices([]);
    if (wpmIntervalRef.current) {
      clearInterval(wpmIntervalRef.current);
      wpmIntervalRef.current = null;
    }
  }, []);

  // WPM tracking interval
  useEffect(() => {
    if (status === 'running' && startTime) {
      wpmIntervalRef.current = setInterval(() => {
        if (!lesson) return;
        const elapsedTime = (Date.now() - startTime) / 1000;
        let correctChars = 0;
        for (let i = 0; i < typedText.length; i++) {
          if (typedText[i] === lesson.text[i]) {
            correctChars++;
          }
        }
        const wpm = calculateWPM(correctChars, elapsedTime);
        setWpmHistory(prev => [...prev, wpm]);
      }, 1000);
    }
    
    return () => {
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current);
        wpmIntervalRef.current = null;
      }
    };
  }, [status, startTime, typedText, lesson]);

  // Calculate live stats
  useEffect(() => {
    if (!lesson || !startTime || typedText.length === 0) return;
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    let correctChars = 0;
    
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === lesson.text[i]) {
        correctChars++;
      }
    }
    
    setCurrentWpm(calculateWPM(correctChars, elapsedTime));
    setCurrentAccuracy(calculateAccuracy(correctChars, typedText.length));
  }, [typedText, lesson, startTime]);

  // Check for completion
  useEffect(() => {
    if (status === 'running' && lesson && typedText.length >= lesson.text.length) {
      finishTest();
    }
  }, [typedText, lesson, status]);

  const finishTest = useCallback(async () => {
    if (!lesson) return;
    
    setStatus('finished');
    
    // Clear WPM interval
    if (wpmIntervalRef.current) {
      clearInterval(wpmIntervalRef.current);
      wpmIntervalRef.current = null;
    }
    
    const elapsedTime = (Date.now() - (startTime || Date.now())) / 1000;
    let correctChars = 0;
    
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === lesson.text[i]) {
        correctChars++;
      }
    }
    
    const wpm = calculateWPM(correctChars, elapsedTime);
    const accuracy = calculateAccuracy(correctChars, typedText.length);
    const consistency = calculateConsistency(wpmHistory);
    
    // Calculate per-character metrics
    const perCharMetrics = calculatePerCharMetrics(keystrokes);
    
    // Update progress and check for unlocks
    const { newlyUnlocked } = updateCharacterProgress(perCharMetrics);
    
    setResults({
      wpm,
      accuracy,
      newlyUnlocked,
      perCharMetrics
    });

    // Save to database
    await saveResult(
      {
        wpm,
        rawWpm: wpm, // In learn mode, raw = net since only correct chars counted
        accuracy,
        consistency,
        correctChars,
        incorrectChars: typedText.length - correctChars,
        totalChars: typedText.length,
        errors: typedText.length - correctChars,
        elapsedTime,
        wpmHistory,
      },
      'learn',
      Math.round(elapsedTime)
    );

    // Convert perCharMetrics Map to record for saving
    const charMetricsRecord: Record<string, { char: string; wpm: number; accuracy: number; confidence: number; occurrences: number }> = {};
    perCharMetrics.forEach((value, key) => {
      charMetricsRecord[key] = {
        char: value.char,
        wpm: value.wpm,
        accuracy: value.accuracy,
        confidence: value.confidence,
        occurrences: value.occurrences,
      };
    });
    await saveCharacterConfidence(charMetricsRecord);
  }, [lesson, typedText, startTime, keystrokes, wpmHistory, saveResult, saveCharacterConfidence]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!lesson) return;
    
    // Start test on first keystroke if idle
    if (status === 'idle') {
      setStatus('running');
      setStartTime(Date.now());
      startTimeRef.current = Date.now();
    }
    
    if (status === 'finished') return;
    
    const value = e.target.value;
    const isBackspace = value.length < typedText.length;
    
    // WORD-LEVEL LOCKING: Prevent backspace to previous completed words
    if (isBackspace) {
      const lastCompletedBoundary = completedWordEndIndices.length > 0 
        ? completedWordEndIndices[completedWordEndIndices.length - 1] 
        : -1;
      
      // If trying to backspace past a completed word, prevent it
      if (value.length <= lastCompletedBoundary) {
        e.target.value = typedText;
        setBackspaceAttempts(prev => prev + 1);
        return;
      }
      
      // Learn mode: reject all backspaces within current word too (100% accuracy requirement)
      setShowErrorFlash(true);
      setTimeout(() => setShowErrorFlash(false), 150);
      setBackspaceAttempts(prev => prev + 1);
      e.target.value = typedText;
      return;
    }
    
    if (value.length <= lesson.text.length) {
      // Get the new character typed
      const newChar = value[value.length - 1];
      const expectedChar = lesson.text[value.length - 1];
      const charIndex = value.length - 1;
      
      // Track current key for keyboard visualization
      if (newChar) {
        setCurrentKeyPressed(newChar);
        setTimeout(() => setCurrentKeyPressed(undefined), 100);
      }
      
      // Learn mode requires 100% accuracy - only accept correct characters
      if (newChar && newChar !== expectedChar) {
        // Wrong character - show error flash but don't accept
        setShowErrorFlash(true);
        setErrorKeys(prev => new Set([...prev, newChar.toLowerCase()]));
        setTimeout(() => setShowErrorFlash(false), 150);
        setTimeout(() => {
          setErrorKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(newChar.toLowerCase());
            return newSet;
          });
        }, 300);
        // Reset input to current typed text to reject the wrong character
        e.target.value = typedText;
        return;
      }
      
      // Track word completion (when space is typed at word boundary)
      if (newChar === ' ' && wordBoundaries.includes(charIndex)) {
        setCompletedWordEndIndices(prev => [...prev, charIndex + 1]);
      }
      
      if (newChar) {
        setKeystrokes(prev => [...prev, {
          char: newChar,
          timestamp: Date.now() - startTimeRef.current,
          isCorrect: true, // Always true in learn mode
          expected: expectedChar
        }]);
      }
      
      setTypedText(value);
    }
  }, [status, lesson, typedText, wordBoundaries, completedWordEndIndices]);

  // Handle key down - NO timer start on Enter, only on first character typed
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab to generate new lesson
    if (e.key === 'Tab') {
      e.preventDefault();
      generateNewLesson();
      return;
    }
    
    // Enter focuses input when idle (does NOT start timer)
    if (status === 'idle' && e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.focus();
      return;
    }
  }, [status, generateNewLesson]);

  // Global keyboard listener - Tab to restart, Enter to focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Tab to generate new lesson
      if (e.key === 'Tab' && status !== 'finished') {
        e.preventDefault();
        generateNewLesson();
      }
      
      // Enter focuses input when idle (does NOT start timer)
      if (status === 'idle' && e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [status, generateNewLesson]);

  // Word groups for display with space state and locking
  type CharState = { char: string; state: string; isSpace?: boolean };
  
  const wordGroups = useMemo(() => {
    if (!lesson) return [];
    
    const words: { chars: CharState[]; hasSpace: boolean; spaceState?: CharState; isLocked: boolean }[] = [];
    let currentWord: CharState[] = [];
    let currentWordStartIdx = 0;
    
    for (let i = 0; i < lesson.text.length; i++) {
      const char = lesson.text[i];
      const typedChar = typedText[i];
      
      let state: string;
      if (i < typedText.length) {
        state = typedChar === char ? 'correct' : 'incorrect';
      } else if (i === typedText.length) {
        state = 'current';
      } else {
        state = 'upcoming';
      }
      
      if (char === ' ') {
        if (currentWord.length > 0 || words.length === 0) {
          const wordEndIdx = i;
          const isLocked = completedWordEndIndices.some(boundary => boundary > currentWordStartIdx && boundary <= wordEndIdx + 1);
          
          words.push({ 
            chars: currentWord, 
            hasSpace: true,
            spaceState: { char: ' ', state, isSpace: true },
            isLocked
          });
          currentWord = [];
          currentWordStartIdx = i + 1;
        }
      } else {
        currentWord.push({ char, state });
      }
    }
    
    if (currentWord.length > 0) {
      words.push({ chars: currentWord, hasSpace: false, isLocked: false });
    }
    
    return words;
  }, [lesson, typedText, completedWordEndIndices]);
  
  // Auto-scroll to keep current character visible
  useEffect(() => {
    if (status !== 'running' || !textDisplayRef.current) return;
    
    const currentCharElement = textDisplayRef.current.querySelector('.char-current');
    if (currentCharElement) {
      const container = textDisplayRef.current;
      const charRect = currentCharElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const lineHeight = 48;
      
      if (charRect.top > containerRect.top + lineHeight * 2) {
        const newOffset = Math.floor((charRect.top - containerRect.top) / lineHeight) - 1;
        setScrollOffset(prev => Math.max(prev, newOffset));
      }
    }
  }, [typedText, status]);

  if (results) {
    return (
      <KeybrResults
        wpm={results.wpm}
        accuracy={results.accuracy}
        newlyUnlocked={results.newlyUnlocked}
        perCharMetrics={results.perCharMetrics}
        onRestart={generateNewLesson}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Adaptive Practice</h2>
      </div>
      
      {/* Focus letters indicator */}
      {lesson && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap className="w-4 h-4 text-warning" />
          <span className="text-sm text-muted-foreground">Focus letters:</span>
          <div className="flex gap-1">
            {lesson.focusLetters.map(letter => (
              <span 
                key={letter} 
                className="px-2 py-0.5 bg-warning/20 text-warning rounded font-mono font-bold uppercase"
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Live Stats */}
      <AnimatePresence>
        {status === 'running' && (
          <motion.div
            className="flex items-center justify-center gap-8 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl font-mono font-bold text-foreground">{currentWpm}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">wpm</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-3xl font-mono font-bold",
                currentAccuracy >= 95 ? "text-primary" : 
                currentAccuracy >= 90 ? "text-warning" : "text-destructive"
              )}>
                {currentAccuracy}%
              </span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">accuracy</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Typing Area */}
      <div
        className={cn(
          "relative bg-card border rounded-2xl p-6 md:p-10 cursor-text min-h-[200px] transition-all duration-300",
          status === 'running' ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border",
          isFocused && status === 'idle' && "border-primary/30",
          showErrorFlash && "border-destructive shadow-destructive/20"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Hidden Input - NOT disabled when idle so user can start typing immediately */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute opacity-0 pointer-events-none"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={status === 'finished'}
        />
        
        {/* Text Display - Paragraph always visible, especially behind idle overlay */}
        <div 
          ref={textDisplayRef}
          className={cn(
            "font-mono text-xl md:text-2xl leading-[2.5] select-none max-h-[200px] overflow-hidden transition-all duration-300",
            status === 'idle' && "opacity-70" // Make text visible behind overlay
          )}
          style={{
            transform: `translateY(-${scrollOffset * 48}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          {wordGroups.map((word, wordIndex) => (
            <span key={wordIndex} className={cn(
              "inline-block whitespace-nowrap",
              word.isLocked && "opacity-80"
            )}>
              {word.chars.map((charState, charIndex) => (
                <span
                  key={charIndex}
                  className={cn(
                    'relative inline-block',
                    charState.state === 'correct' && 'char-correct',
                    charState.state === 'incorrect' && 'char-error animate-shake',
                    charState.state === 'current' && 'char-current',
                    charState.state === 'upcoming' && 'char-upcoming',
                    // Highlight focus letters
                    lesson?.focusLetters.includes(charState.char.toLowerCase()) && 
                    charState.state === 'upcoming' && 'text-warning/80'
                  )}
                >
                  {charState.state === 'current' && status === 'running' && (
                    <motion.span 
                      className="absolute left-0 top-1 w-0.5 h-[calc(100%-8px)] bg-primary rounded-full"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                  {charState.char}
                </span>
              ))}
              {word.hasSpace && word.spaceState && (
                <span
                  className={cn(
                    'inline-block min-w-[0.6em]',
                    word.spaceState.state === 'correct' && 'char-correct',
                    word.spaceState.state === 'incorrect' && 'char-error animate-shake',
                    word.spaceState.state === 'current' && 'char-current',
                    word.spaceState.state === 'upcoming' && 'char-upcoming-space'
                  )}
                >
                  {word.spaceState.state === 'upcoming' ? '·' : '\u00A0'}
                </span>
              )}
              {/* Lock indicator for completed words */}
              {word.isLocked && word.hasSpace && (
                <span className="text-primary/40 text-xs align-super">✓</span>
              )}
            </span>
          ))}
        </div>
        
        {/* Start prompt - 50% transparency so paragraph is clearly visible */}
        {status === 'idle' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 rounded-2xl z-10 cursor-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => inputRef.current?.focus()}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <motion.div
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 rounded-xl cursor-pointer"
                whileHover={{ scale: 1.02 }}
                animate={{ 
                  boxShadow: ['0 0 0px hsl(var(--primary) / 0)', '0 0 20px hsl(var(--primary) / 0.3)', '0 0 0px hsl(var(--primary) / 0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
                onClick={() => inputRef.current?.focus()}
              >
                <span className="text-primary font-mono font-bold text-lg">⌨️ Click to Focus</span>
              </motion.div>
              <p className="text-muted-foreground text-sm font-medium text-center max-w-xs">
                Click here and start typing.<br/>
                <span className="text-primary/80">Timer begins on first keystroke</span><br/>
                <span className="text-warning/80 text-xs">100% accuracy required • No backspace</span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
      
      {/* Controls */}
      <motion.div 
        className="flex items-center justify-center gap-6 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <button
          onClick={generateNewLesson}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
          <span className="text-sm">new lesson</span>
          <span className="text-xs text-muted-foreground/60 ml-1">tab</span>
        </button>
      </motion.div>
      
      {/* Letter Progress */}
      <div className="mt-8">
        <LetterProgressPanel />
      </div>
      
      {/* Keyboard Visualizer with Toggle */}
      <KeyboardVisualizer 
        currentKey={currentKeyPressed}
        errorKeys={errorKeys}
      />
    </div>
  );
}
