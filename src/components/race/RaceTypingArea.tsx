import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RotateCcw, Bot } from 'lucide-react';
import { KeyboardVisualizer } from '@/components/typing/KeyboardVisualizer';
import { getCharacterStates } from '@/lib/typing-engine';

interface RaceTypingAreaProps {
  expectedText: string;
  typedText: string;
  currentWpm: number;
  currentAccuracy: number;
  opponentWpm: number;
  opponentProgress: number;
  isBot: boolean;
  botDifficulty?: string;
  timeRemaining: number;
  isRacing: boolean;
  onTyping: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRestart: () => void;
  autoFocus?: boolean;
}

type ExtendedCharState = ReturnType<typeof getCharacterStates>[0] & { isSpace?: boolean };

export function RaceTypingArea({
  expectedText,
  typedText,
  currentWpm,
  currentAccuracy,
  opponentWpm,
  opponentProgress,
  isBot,
  botDifficulty,
  timeRemaining,
  isRacing,
  onTyping,
  onRestart,
  autoFocus = true,
}: RaceTypingAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentKeyPressed, setCurrentKeyPressed] = useState<string | undefined>();
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [isFocused, setIsFocused] = useState(false);

  const myProgress = Math.round((typedText.length / expectedText.length) * 100);

  // Focus input on mount
  useEffect(() => {
    if (autoFocus && isRacing) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus, isRacing]);

  // Track key presses for keyboard visualizer
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length > typedText.length) {
      const lastChar = newValue[newValue.length - 1];
      const expectedChar = expectedText[newValue.length - 1];
      const isCorrect = lastChar === expectedChar;

      setCurrentKeyPressed(lastChar);
      setTimeout(() => setCurrentKeyPressed(undefined), 100);

      if (!isCorrect && expectedChar) {
        setErrorKeys((prev) => new Set([...prev, lastChar.toLowerCase()]));
        setTimeout(() => {
          setErrorKeys((prev) => {
            const newSet = new Set(prev);
            newSet.delete(lastChar.toLowerCase());
            return newSet;
          });
        }, 300);
      }
    }

    onTyping(e);
  }, [typedText, expectedText, onTyping]);

  // Word groups for multi-line display
  const wordGroups = useMemo(() => {
    const states = getCharacterStates(expectedText, typedText, typedText.length);
    const words: { chars: ExtendedCharState[]; hasSpace: boolean; spaceState?: ExtendedCharState }[] = [];
    let currentWord: ExtendedCharState[] = [];

    states.forEach((charState) => {
      if (charState.char === ' ') {
        if (currentWord.length > 0 || words.length === 0) {
          words.push({
            chars: currentWord,
            hasSpace: true,
            spaceState: { ...charState, isSpace: true },
          });
          currentWord = [];
        }
      } else {
        currentWord.push(charState);
      }
    });

    if (currentWord.length > 0) {
      words.push({ chars: currentWord, hasSpace: false });
    }

    return words;
  }, [expectedText, typedText]);

  // Auto-scroll to keep current character visible
  useEffect(() => {
    if (!isRacing || !textDisplayRef.current) return;

    const currentCharElement = textDisplayRef.current.querySelector('.char-current');
    if (currentCharElement) {
      const container = textDisplayRef.current;
      const charRect = currentCharElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const lineHeight = 48;

      if (charRect.top > containerRect.top + lineHeight * 2) {
        const newOffset = Math.floor((charRect.top - containerRect.top) / lineHeight) - 1;
        setScrollOffset((prev) => Math.max(prev, newOffset));
      }
    }
  }, [typedText, isRacing]);

  return (
    <motion.div
      key="racing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Live Stats Bar */}
      <div className="flex items-center justify-center gap-8 mb-6">
        <div className="text-5xl font-mono font-bold text-primary">{timeRemaining}</div>
        <div className="flex items-center gap-8 text-muted-foreground">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-mono font-bold text-foreground">{currentWpm}</span>
            <span className="text-xs uppercase tracking-wider">wpm</span>
          </div>
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'text-3xl font-mono font-bold',
                currentAccuracy >= 95 ? 'text-primary' : currentAccuracy >= 90 ? 'text-warning' : 'text-destructive'
              )}
            >
              {currentAccuracy.toFixed(0)}%
            </span>
            <span className="text-xs uppercase tracking-wider">accuracy</span>
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="mb-6 space-y-3">
        <div className="stat-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium text-primary text-sm">You</span>
            <span className="font-mono text-sm">{currentWpm} WPM</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${myProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <div className="stat-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-medium text-muted-foreground flex items-center gap-2 text-sm">
              {isBot ? (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  {botDifficulty
                    ? `${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)} Bot`
                    : 'Bot'}
                </>
              ) : (
                'Opponent'
              )}
            </span>
            <span className="font-mono text-muted-foreground text-sm">{opponentWpm} WPM</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-destructive"
              animate={{ width: `${opponentProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Typing Area - Multi-line paragraph */}
      <div
        className={cn(
          'relative bg-card border rounded-2xl p-6 md:p-10 cursor-text min-h-[200px] transition-all duration-300',
          isRacing ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border',
          isFocused && 'border-primary/30'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute opacity-0 pointer-events-none"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={!isRacing}
        />

        {/* Text Display - Multi-line paragraph */}
        <div
          ref={textDisplayRef}
          className="font-mono text-xl md:text-2xl leading-[2.5] select-none max-h-[200px] overflow-hidden"
          style={{
            transform: `translateY(-${scrollOffset * 48}px)`,
            transition: 'transform 0.3s ease-out',
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
                  {charState.state === 'current' && isRacing && (
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

        {/* Word Counter */}
        <motion.div
          className="absolute top-2 right-4 text-muted-foreground text-sm font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-foreground font-bold">
            {typedText.split(' ').filter((w) => w).length}
          </span>
          <span className="mx-1">/</span>
          <span>{expectedText.split(' ').filter((w) => w).length}</span>
          <span className="ml-1 text-xs">words</span>
        </motion.div>
      </div>

      {/* Bottom Controls */}
      <motion.div
        className="flex items-center justify-center gap-6 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
          <span className="text-sm">restart</span>
          <span className="text-xs text-muted-foreground/60 ml-1">tab</span>
        </button>
      </motion.div>

      {/* Keyboard Visualizer */}
      <KeyboardVisualizer currentKey={currentKeyPressed} errorKeys={errorKeys} />
    </motion.div>
  );
}
