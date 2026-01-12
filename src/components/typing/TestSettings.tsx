import { useTestStore, type TestMode, type TestDuration } from '@/stores/test-store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Type, Quote, Sparkles, Hash, LetterText, Brain, Code } from 'lucide-react';

const modes: { value: TestMode; label: string; icon: React.ReactNode }[] = [
  { value: 'time', label: 'time', icon: <Clock className="w-4 h-4" /> },
  { value: 'words', label: 'words', icon: <Type className="w-4 h-4" /> },
  { value: 'quote', label: 'quote', icon: <Quote className="w-4 h-4" /> },
  { value: 'code', label: 'code', icon: <Code className="w-4 h-4" /> },
  { value: 'zen', label: 'zen', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'keybr', label: 'learn', icon: <Brain className="w-4 h-4" /> },
];

const durations: TestDuration[] = [15, 30, 60, 120];
const wordCounts = [25, 50, 100, 200];

export function TestSettings() {
  const { settings, setSettings, status } = useTestStore();
  
  if (status === 'running') return null;
  
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-6 mb-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mode Selection */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setSettings({ mode: mode.value })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              settings.mode === mode.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>
      
      {/* Duration/Word Count Selection */}
      {settings.mode === 'time' && (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {durations.map((duration) => (
            <button
              key={duration}
              onClick={() => setSettings({ duration })}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                settings.duration === duration
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {duration}
            </button>
          ))}
        </div>
      )}
      
      {settings.mode === 'words' && (
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {wordCounts.map((count) => (
            <button
              key={count}
              onClick={() => setSettings({ wordCount: count })}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                settings.wordCount === count
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {count}
            </button>
          ))}
        </div>
      )}
      
      {/* Options */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={() => setSettings({ punctuation: !settings.punctuation })}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            settings.punctuation
              ? 'bg-secondary text-secondary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <LetterText className="w-4 h-4" />
          @ #
        </button>
        <button
          onClick={() => setSettings({ numbers: !settings.numbers })}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            settings.numbers
              ? 'bg-secondary text-secondary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Hash className="w-4 h-4" />
          123
        </button>
      </div>
    </motion.div>
  );
}
