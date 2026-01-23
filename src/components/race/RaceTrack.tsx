import { useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Bot } from 'lucide-react';

interface RaceTrackProps {
  expectedText: string;
  typedText: string;
  currentWpm: number;
  opponentWpm: number;
  opponentProgress: number;
  isBot: boolean;
  botDifficulty?: string;
  onTyping: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

export const RaceTrack = ({
  expectedText,
  typedText,
  currentWpm,
  opponentWpm,
  opponentProgress,
  isBot,
  botDifficulty,
  onTyping,
  autoFocus = true,
}: RaceTrackProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const myProgress = Math.round((typedText.length / expectedText.length) * 100);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  return (
    <motion.div
      key="racing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      {/* Progress bars */}
      <div className="mb-8 space-y-4">
        <div className="stat-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-primary">You</span>
            <span className="font-mono">{currentWpm} WPM</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${myProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <div className="stat-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-muted-foreground flex items-center gap-2">
              {isBot ? (
                <>
                  <Bot className="w-4 h-4" />
                  {botDifficulty ? `${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)} Bot` : 'Bot'}
                </>
              ) : (
                'Opponent'
              )}
            </span>
            <span className="font-mono text-muted-foreground">
              {opponentWpm} WPM
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-destructive"
              animate={{ width: `${opponentProgress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Text display */}
      <div className="stat-card p-6 mb-4 font-mono text-lg leading-relaxed">
        {expectedText.split('').map((char, i) => {
          let className = 'text-muted-foreground';
          if (i < typedText.length) {
            className = typedText[i] === char ? 'text-primary' : 'text-destructive bg-destructive/20';
          } else if (i === typedText.length) {
            className = 'bg-primary/30 text-foreground';
          }
          return (
            <span key={i} className={className}>
              {char}
            </span>
          );
        })}
      </div>

      <Input
        ref={inputRef}
        value={typedText}
        onChange={onTyping}
        className="text-lg font-mono"
        placeholder="Start typing..."
        autoFocus={autoFocus}
      />
    </motion.div>
  );
};
