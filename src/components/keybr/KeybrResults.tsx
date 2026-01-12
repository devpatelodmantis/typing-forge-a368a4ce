import { motion } from 'framer-motion';
import { StatCard } from '@/components/typing/StatCard';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConfidenceStatus, type CharacterConfidence } from '@/lib/keybr-engine';

interface KeybrResultsProps {
  wpm: number;
  accuracy: number;
  newlyUnlocked: string[];
  perCharMetrics: Map<string, CharacterConfidence>;
  onRestart: () => void;
}

export function KeybrResults({ 
  wpm, 
  accuracy, 
  newlyUnlocked, 
  perCharMetrics,
  onRestart 
}: KeybrResultsProps) {
  // Sort metrics by confidence (weakest first)
  const sortedMetrics = Array.from(perCharMetrics.values())
    .sort((a, b) => a.confidence - b.confidence);
  
  const weakestKeys = sortedMetrics.slice(0, 5);
  const strongestKeys = sortedMetrics.slice(-5).reverse();

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Newly Unlocked Celebration */}
      {newlyUnlocked.length > 0 && (
        <motion.div
          className="mb-8 p-6 bg-gradient-to-r from-success/10 via-success/5 to-success/10 border border-success/30 rounded-2xl text-center"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-success" />
            <h2 className="text-2xl font-bold text-success">Letters Unlocked!</h2>
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <div className="flex justify-center gap-3">
            {newlyUnlocked.map((letter, i) => (
              <motion.div
                key={letter}
                className="w-14 h-14 bg-success/20 border-2 border-success rounded-xl flex items-center justify-center text-2xl font-bold text-success uppercase"
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
              >
                {letter}
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-success/80 text-sm">
            Great progress! These letters are now part of your practice pool.
          </p>
        </motion.div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="WPM" 
          value={wpm} 
          variant={wpm >= 60 ? 'success' : wpm >= 40 ? 'primary' : 'default'}
          size="lg"
        />
        <StatCard 
          label="Accuracy" 
          value={accuracy} 
          suffix="%" 
          variant={accuracy >= 98 ? 'success' : accuracy >= 95 ? 'primary' : accuracy >= 90 ? 'warning' : 'error'}
          size="lg"
        />
      </div>

      {/* Per-Character Analysis */}
      <motion.div
        className="grid md:grid-cols-2 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Weakest Keys */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-warning rotate-180" />
            <h3 className="font-semibold">Focus Areas</h3>
          </div>
          <div className="space-y-3">
            {weakestKeys.map(metric => {
              const status = getConfidenceStatus(metric.confidence, metric.isUnlocked);
              return (
                <div key={metric.char} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center font-mono font-bold uppercase">
                      {metric.char}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{Math.round(metric.confidence * 100)}% confidence</div>
                      <div className="text-xs text-muted-foreground">
                        {metric.wpm} WPM · {metric.accuracy}% acc
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    status.color === 'success' && 'bg-success/20 text-success',
                    status.color === 'primary' && 'bg-primary/20 text-primary',
                    status.color === 'warning' && 'bg-warning/20 text-warning',
                    status.color === 'destructive' && 'bg-destructive/20 text-destructive'
                  )}>
                    {status.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strongest Keys */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-success" />
            <h3 className="font-semibold">Strongest Keys</h3>
          </div>
          <div className="space-y-3">
            {strongestKeys.map(metric => {
              const status = getConfidenceStatus(metric.confidence, metric.isUnlocked);
              return (
                <div key={metric.char} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-success/20 text-success rounded-lg flex items-center justify-center font-mono font-bold uppercase">
                      {metric.char}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{Math.round(metric.confidence * 100)}% confidence</div>
                      <div className="text-xs text-muted-foreground">
                        {metric.wpm} WPM · {metric.accuracy}% acc
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    status.color === 'success' && 'bg-success/20 text-success',
                    status.color === 'primary' && 'bg-primary/20 text-primary'
                  )}>
                    {status.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Action */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onRestart}
          size="lg"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Continue Practice
        </Button>
      </motion.div>
    </motion.div>
  );
}
