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
  const [timeRemaining, setTimeRemaining] = useState<number>(settings.duration);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
        // Generate more words for timed tests
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
    
    return {
      wpm,
      accuracy,
      correctChars,
      incorrectChars,
      totalChars: typedText.length,
      elapsedTime,
    };
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
      
      // Sample WPM every second
      wpmIntervalRef.current = setInterval(() => {
        addWpmSample(stats.wpm);
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    };
  }, [status, settings.mode, finishTest, addWpmSample, stats.wpm]);
  
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
  
  // Handle input
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Start test on first keystroke
    if (status === 'idle' && value.length > 0) {
      startTest();
    }
    
    // Don't allow typing beyond target
    if (value.length <= targetText.length) {
      updateTypedText(value);
    }
  }, [status, startTest, updateTypedText, targetText.length]);
  
  // Focus input on click
  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  
  // Handle restart
  const handleRestart = useCallback(() => {
    resetTest();
    generateText();
    inputRef.current?.focus();
  }, [resetTest, generateText]);
  
  // Get character states for rendering
  const characterStates = useMemo(() => {
    return getCharacterStates(targetText, typedText, typedText.length);
  }, [targetText, typedText]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <div className="w-full max-w-4xl mx-auto">
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
              <div className="text-4xl font-mono font-bold text-primary">
                {timeRemaining}
              </div>
            )}
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-semibold text-foreground">{currentWpm}</span>
                <span className="text-sm">wpm</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-2xl font-mono font-semibold",
                  currentAccuracy >= 95 ? "text-success" : 
                  currentAccuracy >= 90 ? "text-warning" : "text-destructive"
                )}>
                  {currentAccuracy}
                </span>
                <span className="text-sm">%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Typing Area */}
      <div
        className="relative bg-card border border-border rounded-2xl p-6 md:p-10 cursor-text min-h-[180px] shadow-lg"
        onClick={handleClick}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInput}
          className="absolute opacity-0 pointer-events-none"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={status === 'finished'}
        />
        
        {/* Text Display */}
        <div className="font-mono text-xl md:text-2xl leading-loose select-none break-words max-h-[300px] overflow-hidden">
          {characterStates.slice(0, 300).map((charState, index) => (
            <span
              key={index}
              className={cn(
                'relative transition-colors duration-75 inline',
                charState.state === 'correct' && 'text-typing-correct',
                charState.state === 'incorrect' && 'text-typing-error bg-destructive/20 rounded-sm px-0.5',
                charState.state === 'current' && 'text-primary',
                charState.state === 'upcoming' && 'text-muted-foreground'
              )}
            >
              {charState.state === 'current' && (
                <span className="absolute left-0 top-1 w-0.5 h-[calc(100%-8px)] bg-primary caret-blink rounded-full" />
              )}
              {charState.char === ' ' ? '\u00A0' : charState.char}
            </span>
          ))}
        </div>
        
        {/* Focus hint */}
        {status === 'idle' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-muted-foreground text-lg font-medium">
              Click here or start typing to begin
            </p>
          </motion.div>
        )}
      </div>
      
      {/* Restart Button */}
      <motion.div 
        className="flex justify-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">restart test</span>
        </button>
      </motion.div>
    </div>
  );
}
