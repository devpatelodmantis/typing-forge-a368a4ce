import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Bot, Users } from 'lucide-react';
import { BotDifficulty } from '@/lib/bot-engine';

interface RaceSettingsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  disabled?: boolean;
}

const durations = [15, 30, 60, 120];

const difficultyLabels: Record<BotDifficulty, { label: string; color: string }> = {
  beginner: { label: 'Easy', color: 'text-green-500' },
  intermediate: { label: 'Medium', color: 'text-amber-500' },
  pro: { label: 'Hard', color: 'text-red-500' },
};

export function RaceSettings({
  duration,
  onDurationChange,
  isBot,
  botDifficulty,
  disabled = false,
}: RaceSettingsProps) {
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-4 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Race Mode Indicator */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
        {isBot ? (
          <>
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              vs{' '}
              <span className={botDifficulty ? difficultyLabels[botDifficulty].color : 'text-primary'}>
                {botDifficulty ? difficultyLabels[botDifficulty].label : 'Bot'}
              </span>
            </span>
          </>
        ) : (
          <>
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">vs Human</span>
          </>
        )}
      </div>

      {/* Duration Selection */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Clock className="w-4 h-4 text-muted-foreground ml-2" />
        {durations.map((d) => (
          <button
            key={d}
            onClick={() => !disabled && onDurationChange(d)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              duration === d
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {d}s
          </button>
        ))}
      </div>
    </motion.div>
  );
}
