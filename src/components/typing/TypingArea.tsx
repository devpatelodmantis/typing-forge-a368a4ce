import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTestStore } from '@/stores/test-store';
import { 
  calculateWPM, 
  calculateAccuracy, 
  calculateConsistency,
  getCharacterStates,
  type TypingStats 
} from '@/lib/typing-engine';
import { type Keystroke } from '@/lib/professional-accuracy';
import { generateRandomWords, getRandomQuote } from '@/lib/quotes';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import { KeyboardVisualizer } from './KeyboardVisualizer';

interface TypingAreaProps {
  onTestComplete: (stats: TypingStats & { 
    wpmHistory: number[]; 
    backspaceCount: number;
    keystrokeLog: Keystroke[];
    targetText: string;
    typedText: string;
  }) => void;
}

export function TypingArea({ onTestComplete }: TypingAreaProps) {
  const {
    settings,
    status,
    targetText,
    typedText,
    startTime,
    wpmHistory,
    setTargetText,
    startTest,
    updateTypedText,
    finishTest,
    resetTest,
    addWpmSample,
  } = useTestStore();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(settings.duration);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const [isFocused, setIsFocused] = useState(false);
  const [zenWordsTyped, setZenWordsTyped] = useState(0);
  const [zenElapsedTime, setZenElapsedTime] = useState(0);
  const [currentKeyPressed, setCurrentKeyPressed] = useState<string | undefined>();
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  
  // NEW: Ready state - paragraph visible, waiting for first keystroke
  const [isReady, setIsReady] = useState(false);
  const [showTabHint, setShowTabHint] = useState(false);
  
  // CRITICAL: Track backspace usage for strict accuracy
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  
  // PROFESSIONAL ACCURACY: Track all keystrokes with timestamps
  const [keystrokeLog, setKeystrokeLog] = useState<Keystroke[]>([]);
  const testStartTimeRef = useRef<number>(0);
  
  // Track completed word indices for word-level locking
  const [completedWordEndIndices, setCompletedWordEndIndices] = useState<number[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const zenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsRef = useRef({ wpm: 0, accuracy: 100, correctChars: 0, incorrectChars: 0, totalChars: 0, elapsedTime: 0 });
  
  // Generate text based on mode
  const generateText = useCallback(() => {
    let text = '';
    switch (settings.mode) {
      case 'quote':
        text = getRandomQuote().text;
        break;
      case 'words':
        text = generateRandomWords(settings.wordCount, settings.punctuation, settings.numbers);
        break;
      case 'time':
      case 'zen':
      default:
        text = generateRandomWords(200, settings.punctuation, settings.numbers);
        break;
    }
    setTargetText(text);
    setTimeRemaining(settings.duration);
    setBackspaceCount(0);
    setTotalKeystrokes(0);
    setCompletedWordEndIndices([]);
    setKeystrokeLog([]);
    testStartTimeRef.current = 0;
  }, [settings, setTargetText]);
  
  // Pre-calculate word boundaries from target text
  const wordBoundaries = useMemo(() => {
    const boundaries: number[] = [];
    for (let i = 0; i < targetText.length; i++) {
      if (targetText[i] === ' ') {
        boundaries.push(i);
      }
    }
    return boundaries;
  }, [targetText]);
  
  // Initialize text
  useEffect(() => {
    generateText();
  }, [generateText]);
  
  // Calculate stats with strict accuracy (backspace = not 100%)
  const stats = useMemo(() => {
    let correctChars = 0;
    let incorrectChars = 0;
    
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === targetText[i]) {
        correctChars++;
      } else {
        incorrectChars++;
      }
    }
    
    const elapsedTime = startTime ? (Date.now() - startTime) / 1000 : 0;
    const wpm = calculateWPM(correctChars, elapsedTime);
    
    // CRITICAL: Calculate accuracy - if backspace used, cap at 99.99%
    let accuracy = calculateAccuracy(correctChars, typedText.length);
    if (backspaceCount > 0 && accuracy === 100) {
      accuracy = 99.99;
    }
    
    const result = {
      wpm,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars: typedText.length,
      elapsedTime,
    };
    
    statsRef.current = result;
    return result;
  }, [typedText, targetText, startTime, backspaceCount]);
  
  // Update live stats
  useEffect(() => {
    setCurrentWpm(stats.wpm);
    setCurrentAccuracy(stats.accuracy);
  }, [stats]);
  
  // Timer for time mode
  useEffect(() => {
    if (status === 'running' && settings.mode === 'time') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Sample WPM every second using ref to avoid stale closure
      wpmIntervalRef.current = setInterval(() => {
        addWpmSample(statsRef.current.wpm);
      }, 1000);
    }
    
    // Zen mode timer - just track elapsed time
    if (status === 'running' && settings.mode === 'zen') {
      zenTimerRef.current = setInterval(() => {
        setZenElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
      if (zenTimerRef.current) clearInterval(zenTimerRef.current);
    };
  }, [status, settings.mode, finishTest, addWpmSample]);
  
  // Track words typed for Zen mode
  useEffect(() => {
    if (settings.mode === 'zen' && typedText.length > 0) {
      const words = typedText.trim().split(/\s+/).filter(w => w.length > 0);
      setZenWordsTyped(words.length);
    }
  }, [typedText, settings.mode]);
  
  // Check for completion in words/quote mode
  useEffect(() => {
    if (status === 'running' && (settings.mode === 'words' || settings.mode === 'quote')) {
      if (typedText.length >= targetText.length) {
        finishTest();
      }
    }
  }, [typedText, targetText, status, settings.mode, finishTest]);
  
  // Handle test completion
  useEffect(() => {
    if (status === 'finished') {
      const consistency = calculateConsistency(wpmHistory);
      onTestComplete({
        wpm: stats.wpm,
        rawWpm: stats.wpm,
        accuracy: stats.accuracy,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars,
        totalChars: stats.totalChars,
        errors: stats.incorrectChars,
        elapsedTime: stats.elapsedTime,
        consistency,
        wpmHistory,
        backspaceCount,
        keystrokeLog,
        targetText,
        typedText, // Pass actual typed text
      });
    }
  }, [status, stats, wpmHistory, onTestComplete, backspaceCount, keystrokeLog, targetText, typedText]);
  
  // Handle keyboard input - start test on first keystroke
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Start test on first keystroke if idle
    if (status === 'idle') {
      startTest();
      testStartTimeRef.current = performance.now();
    }
    
    if (status === 'finished') return;
    
    const value = e.target.value;
    const isBackspace = value.length < typedText.length;
    const currentTimestamp = performance.now() - testStartTimeRef.current;
    
    // WORD-LEVEL LOCKING: Prevent backspace to previous completed words
    if (isBackspace) {
      // Find the last completed word boundary
      const lastCompletedBoundary = completedWordEndIndices.length > 0 
        ? completedWordEndIndices[completedWordEndIndices.length - 1] 
        : -1;
      
      // If trying to backspace past a completed word boundary, prevent it
      // User can backspace within current word (even if first char of new word)
      if (value.length < lastCompletedBoundary) {
        e.target.value = typedText;
        return;
      }
      
      // Track backspace for accuracy penalty
      setBackspaceCount(prev => prev + 1);
      
      // Log backspace keystroke
      setKeystrokeLog(prev => [...prev, {
        key: 'Backspace',
        char: '',
        timestamp: currentTimestamp,
        position: value.length,
        expected: targetText[value.length] || '',
        isCorrect: false,
      }]);
    }
    
    // Track total keystrokes
    setTotalKeystrokes(prev => prev + 1);
    
    // Track word completion (when space is typed after a word)
    if (!isBackspace && value.length > typedText.length) {
      const lastChar = value[value.length - 1];
      const lastIndex = value.length - 1;
      const expectedChar = targetText[lastIndex];
      const isCorrect = lastChar === expectedChar;
      
      // Log keystroke with full details
      setKeystrokeLog(prev => [...prev, {
        key: lastChar,
        char: lastChar,
        timestamp: currentTimestamp,
        position: lastIndex,
        expected: expectedChar || '',
        isCorrect,
      }]);
      
      // If space was typed and it's at a word boundary, lock the word
      if (lastChar === ' ' && wordBoundaries.includes(lastIndex)) {
        setCompletedWordEndIndices(prev => [...prev, lastIndex + 1]);
      }
      
      // Track current key for keyboard visualization
      setCurrentKeyPressed(lastChar);
      
      // Track error keys
      if (!isCorrect && expectedChar) {
        setErrorKeys(prev => new Set([...prev, lastChar.toLowerCase()]));
        setTimeout(() => {
          setErrorKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(lastChar.toLowerCase());
            return newSet;
          });
        }, 300);
      }
      
      // Clear current key highlight after brief moment
      setTimeout(() => setCurrentKeyPressed(undefined), 100);
    }
    
    // Don't allow typing beyond target
    if (value.length <= targetText.length) {
      updateTypedText(value);
    }
  }, [status, startTest, updateTypedText, targetText, typedText, wordBoundaries, completedWordEndIndices]);
  
  // Handle key down events - NO timer start on Enter, only on first character typed
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab key - show restart hint or restart if already showing
    if (e.key === 'Tab') {
      e.preventDefault();
      if (showTabHint || status === 'running') {
        // Actually restart
        resetTest();
        generateText();
        setIsReady(false);
        setShowTabHint(false);
        inputRef.current?.focus();
      } else {
        // Show the restart hint
        setShowTabHint(true);
      }
      return;
    }
    
    // Enter key when idle - show paragraph (ready state)
    if (status === 'idle' && e.key === 'Enter') {
      e.preventDefault();
      setIsReady(true);
      setShowTabHint(false);
      inputRef.current?.focus();
      return;
    }
    
    // Enter key when ready with tab hint showing - start new test
    if (isReady && showTabHint && e.key === 'Enter') {
      e.preventDefault();
      resetTest();
      generateText();
      setIsReady(true);
      setShowTabHint(false);
      inputRef.current?.focus();
      return;
    }
  }, [status, resetTest, generateText, showTabHint, isReady]);
  
  // Global keyboard listener - Tab to show restart hint, Enter to reveal paragraph
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Tab key handling
      if (e.key === 'Tab' && status !== 'finished') {
        e.preventDefault();
        if (showTabHint || status === 'running') {
          // Actually restart
          resetTest();
          generateText();
          setIsReady(false);
          setShowTabHint(false);
          inputRef.current?.focus();
        } else {
          // Show the restart hint
          setShowTabHint(true);
        }
        return;
      }
      
      // Enter when idle - reveal paragraph (ready state)
      if (status === 'idle' && e.key === 'Enter') {
        e.preventDefault();
        setIsReady(true);
        setShowTabHint(false);
        inputRef.current?.focus();
        return;
      }
      
      // Enter when ready with tab hint - start new test
      if (isReady && showTabHint && e.key === 'Enter') {
        e.preventDefault();
        resetTest();
        generateText();
        setIsReady(true);
        setShowTabHint(false);
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [status, resetTest, generateText, showTabHint, isReady]);
  
  // Focus input on click - allow starting by clicking (reveals paragraph)
  const handleClick = useCallback(() => {
    if (status === 'idle') {
      setIsReady(true);
      setShowTabHint(false);
    }
    inputRef.current?.focus();
  }, [status]);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    resetTest();
    generateText();
    setScrollOffset(0);
    setZenWordsTyped(0);
    setZenElapsedTime(0);
    setCurrentKeyPressed(undefined);
    setErrorKeys(new Set());
    setBackspaceCount(0);
    setTotalKeystrokes(0);
    setCompletedWordEndIndices([]);
    setIsReady(false);
    setShowTabHint(false);
    setKeystrokeLog([]);
    testStartTimeRef.current = 0;
    inputRef.current?.focus();
  }, [resetTest, generateText]);
  
  // Define extended type for space handling
  type ExtendedCharState = ReturnType<typeof getCharacterStates>[0] & { isSpace?: boolean; isLocked?: boolean };
  
  // Get character states for rendering - grouped by words with space handling and locking
  const wordGroups = useMemo(() => {
    const states = getCharacterStates(targetText, typedText, typedText.length);
    const words: { chars: ExtendedCharState[]; hasSpace: boolean; spaceState?: ExtendedCharState; isLocked: boolean }[] = [];
    let currentWord: ExtendedCharState[] = [];
    let currentWordStartIdx = 0;
    
    states.forEach((charState, idx) => {
      if (charState.char === ' ') {
        if (currentWord.length > 0 || words.length === 0) {
          // Check if this word is locked (completed)
          const wordEndIdx = idx;
          const isLocked = completedWordEndIndices.some(boundary => boundary > currentWordStartIdx && boundary <= wordEndIdx + 1);
          
          words.push({ 
            chars: currentWord, 
            hasSpace: true,
            spaceState: { ...charState, isSpace: true },
            isLocked
          });
          currentWord = [];
          currentWordStartIdx = idx + 1;
        }
      } else {
        currentWord.push(charState);
      }
    });
    
    // Push last word if any
    if (currentWord.length > 0) {
      words.push({ chars: currentWord, hasSpace: false, isLocked: false });
    }
    
    return words;
  }, [targetText, typedText, completedWordEndIndices]);
  
  // Auto-scroll to keep current character visible
  useEffect(() => {
    if (status !== 'running' || !textDisplayRef.current) return;
    
    const currentCharElement = textDisplayRef.current.querySelector('.char-current');
    if (currentCharElement) {
      const container = textDisplayRef.current;
      const charRect = currentCharElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate line height (approximately)
      const lineHeight = 48; // Matches the text size
      
      // If current char is below visible area, scroll down
      if (charRect.top > containerRect.top + lineHeight * 2) {
        const newOffset = Math.floor((charRect.top - containerRect.top) / lineHeight) - 1;
        setScrollOffset(prev => Math.max(prev, newOffset));
      }
    }
  }, [typedText, status]);
  
  // Focus input on mount and status change
  useEffect(() => {
    if (status === 'running') {
      inputRef.current?.focus();
    }
  }, [status]);
  
  return (
    <div 
      className="w-full max-w-4xl mx-auto" 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Live Stats Bar */}
      <AnimatePresence>
        {status === 'running' && settings.mode !== 'zen' && (
          <motion.div
            className="flex items-center justify-center gap-8 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {settings.mode === 'time' && (
              <div className="text-5xl font-mono font-bold text-primary">
                {timeRemaining}
              </div>
            )}
            <div className="flex items-center gap-8 text-muted-foreground">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold text-foreground">{currentWpm}</span>
                <span className="text-xs uppercase tracking-wider">wpm</span>
              </div>
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-3xl font-mono font-bold",
                  currentAccuracy >= 95 ? "text-primary" : 
                  currentAccuracy >= 90 ? "text-warning" : "text-destructive"
                )}>
                  {currentAccuracy}%
                </span>
                <span className="text-xs uppercase tracking-wider">accuracy</span>
              </div>
              {/* Show backspace indicator if used */}
              {backspaceCount > 0 && (
                <div className="flex flex-col items-center opacity-60">
                  <span className="text-lg font-mono text-warning">{backspaceCount}</span>
                  <span className="text-xs uppercase tracking-wider">corrections</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Zen Mode - Minimal distraction stats */}
        {status === 'running' && settings.mode === 'zen' && (
          <motion.div
            className="flex items-center justify-center gap-6 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="font-mono">{zenWordsTyped}</span>
              <span className="text-xs">words</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="font-mono">{Math.floor(zenElapsedTime / 60)}:{(zenElapsedTime % 60).toString().padStart(2, '0')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Typing Area */}
      <div
        className={cn(
          "relative bg-card border rounded-2xl p-6 md:p-10 cursor-text min-h-[200px] transition-all duration-300",
          status === 'running' ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border",
          isFocused && status === 'idle' && "border-primary/30"
        )}
        onClick={handleClick}
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
        
        {/* Text Display - Paragraph always visible when ready */}
        <div 
          ref={textDisplayRef}
          className={cn(
            "font-mono text-xl md:text-2xl leading-[2.5] select-none max-h-[200px] overflow-hidden transition-all duration-300",
            status === 'idle' && !isReady && "opacity-50" // Faded behind overlay when not ready
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
                    charState.state === 'upcoming' && 'char-upcoming'
                  )}
                >
                  {charState.state === 'current' && (status === 'running' || isReady) && (
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
              {/* No visual lock indicator - just prevent backspace */}
            </span>
          ))}
        </div>
        
        {/* Word Counter - shows when ready or running */}
        {(isReady || status === 'running') && status !== 'finished' && (
          <motion.div
            className="absolute top-2 right-4 text-muted-foreground text-sm font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-foreground font-bold">{typedText.split(' ').filter(w => w).length}</span>
            <span className="mx-1">/</span>
            <span>{targetText.split(' ').filter(w => w).length}</span>
            <span className="ml-1 text-xs">words</span>
          </motion.div>
        )}
        
        {/* Tab hint overlay - shows when Tab pressed in ready state */}
        {status === 'idle' && isReady && showTabHint && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex gap-4">
                <motion.div
                  className="px-4 py-2 bg-warning/20 border border-warning/40 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-warning font-mono font-bold">Tab</span>
                  <span className="text-muted-foreground ml-2">→ Restart</span>
                </motion.div>
                <motion.div
                  className="px-4 py-2 bg-primary/20 border border-primary/40 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-primary font-mono font-bold">Enter</span>
                  <span className="text-muted-foreground ml-2">→ New Test</span>
                </motion.div>
              </div>
              <p className="text-muted-foreground text-sm">
                Press <span className="text-warning font-bold">Tab</span> again to restart or <span className="text-primary font-bold">Enter</span> for a new test
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Start prompt overlay - only when NOT ready */}
        {status === 'idle' && !isReady && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 rounded-2xl z-10 cursor-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={handleClick}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 rounded-xl cursor-pointer"
                whileHover={{ scale: 1.02 }}
                animate={{ 
                  boxShadow: ['0 0 0px hsl(var(--primary) / 0)', '0 0 20px hsl(var(--primary) / 0.3)', '0 0 0px hsl(var(--primary) / 0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
                onClick={handleClick}
              >
                <span className="text-primary font-mono font-bold text-lg">⌨️ Click or Press Enter</span>
              </motion.div>
              <p className="text-muted-foreground text-sm font-medium text-center max-w-xs">
                Click here or press Enter to reveal the text.<br/>
                <span className="text-primary/80">Timer begins on first keystroke</span><br/>
                <span className="text-warning/80 text-xs">Backspace = accuracy penalty • No going back after word complete</span>
              </p>
            </motion.div>
          </motion.div>
        )}
        
        {/* Ready state prompt - just a small hint at the bottom */}
        {status === 'idle' && isReady && !showTabHint && (
          <motion.div
            className="absolute bottom-2 left-0 right-0 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <span>Start typing to begin</span>
              <span className="text-xs opacity-60">•</span>
              <span className="text-xs">Press <span className="text-warning font-mono">Tab</span> for options</span>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Bottom Controls */}
      <motion.div 
        className="flex items-center justify-center gap-6 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
          <span className="text-sm">restart</span>
          <span className="text-xs text-muted-foreground/60 ml-1">tab</span>
        </button>
        
        {/* Zen mode finish button */}
        {status === 'running' && settings.mode === 'zen' && zenWordsTyped >= 10 && (
          <button
            onClick={() => finishTest()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg"
          >
            <span className="text-sm">Finish</span>
          </button>
        )}
      </motion.div>
      
      {/* Keyboard Visualizer with Toggle */}
      <KeyboardVisualizer 
        currentKey={currentKeyPressed}
        errorKeys={errorKeys}
      />
    </div>
  );
}
