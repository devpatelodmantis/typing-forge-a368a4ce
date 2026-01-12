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
import { generateRandomWords, getRandomQuote } from '@/lib/quotes';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface TypingAreaProps {
  onTestComplete: (stats: TypingStats & { wpmHistory: number[] }) => void;
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
  }, [settings, setTargetText]);
  
  // Initialize text
  useEffect(() => {
    generateText();
  }, [generateText]);
  
  // Calculate stats
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
    const accuracy = calculateAccuracy(correctChars, typedText.length);
    
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
  }, [typedText, targetText, startTime]);
  
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
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    };
  }, [status, settings.mode, finishTest, addWpmSample]);
  
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
      });
    }
  }, [status, stats, wpmHistory, onTestComplete]);
  
  // Handle keyboard input - start test on first keystroke
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Start test on first keystroke if idle
    if (status === 'idle') {
      startTest();
    }
    
    if (status === 'finished') return;
    
    const value = e.target.value;
    
    // Don't allow typing beyond target
    if (value.length <= targetText.length) {
      updateTypedText(value);
    }
  }, [status, startTest, updateTypedText, targetText.length]);
  
  // Handle key down events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Start test on Enter key when idle
    if (status === 'idle' && e.key === 'Enter') {
      e.preventDefault();
      startTest();
      inputRef.current?.focus();
      return;
    }
    
    // Restart on Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
      generateText();
      inputRef.current?.focus();
      return;
    }
  }, [status, startTest, resetTest, generateText]);
  
  // Global keyboard listener for Enter to start
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (status === 'idle' && e.key === 'Enter') {
        e.preventDefault();
        startTest();
        inputRef.current?.focus();
      }
      
      // Tab to restart
      if (e.key === 'Tab' && status !== 'finished') {
        e.preventDefault();
        resetTest();
        generateText();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [status, startTest, resetTest, generateText]);
  
  // Focus input on click
  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    resetTest();
    generateText();
    setScrollOffset(0);
    inputRef.current?.focus();
  }, [resetTest, generateText]);
  
  // Define extended type for space handling
  type ExtendedCharState = ReturnType<typeof getCharacterStates>[0] & { isSpace?: boolean };
  
  // Get character states for rendering - grouped by words with space handling
  const wordGroups = useMemo(() => {
    const states = getCharacterStates(targetText, typedText, typedText.length);
    const words: { chars: ExtendedCharState[]; hasSpace: boolean; spaceState?: ExtendedCharState }[] = [];
    let currentWord: ExtendedCharState[] = [];
    
    states.forEach((charState) => {
      if (charState.char === ' ') {
        if (currentWord.length > 0 || words.length === 0) {
          words.push({ 
            chars: currentWord, 
            hasSpace: true,
            spaceState: { ...charState, isSpace: true }
          });
          currentWord = [];
        }
      } else {
        currentWord.push(charState);
      }
    });
    
    // Push last word if any
    if (currentWord.length > 0) {
      words.push({ chars: currentWord, hasSpace: false });
    }
    
    return words;
  }, [targetText, typedText]);
  
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
                  currentAccuracy >= 95 ? "text-success" : 
                  currentAccuracy >= 90 ? "text-warning" : "text-destructive"
                )}>
                  {currentAccuracy}%
                </span>
                <span className="text-xs uppercase tracking-wider">accuracy</span>
              </div>
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
        
        {/* Text Display */}
        <div 
          ref={textDisplayRef}
          className={cn(
            "font-mono text-xl md:text-2xl leading-[2.5] select-none max-h-[200px] overflow-hidden transition-all duration-300",
            status === 'idle' && "opacity-50"
          )}
          style={{
            transform: `translateY(-${scrollOffset * 48}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          {wordGroups.map((word, wordIndex) => (
            <span key={wordIndex} className="inline-block whitespace-nowrap">
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
            </span>
          ))}
        </div>
        
        {/* Start prompt overlay */}
        {status === 'idle' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 rounded-2xl z-10 cursor-text"
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
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/30 rounded-xl"
                whileHover={{ scale: 1.02 }}
                animate={{ 
                  boxShadow: ['0 0 0px hsl(var(--primary) / 0)', '0 0 20px hsl(var(--primary) / 0.3)', '0 0 0px hsl(var(--primary) / 0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-primary font-mono font-bold text-lg">⌨️ Start Typing</span>
              </motion.div>
              <p className="text-muted-foreground text-sm font-medium">
                click here and start typing
              </p>
            </motion.div>
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
      </motion.div>
    </div>
  );
}
