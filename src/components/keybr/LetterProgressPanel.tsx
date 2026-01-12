import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  getAllCharacterStats, 
  getConfidenceStatus,
  type CharacterConfidence 
} from '@/lib/keybr-engine';
import { Lock, Check, TrendingUp } from 'lucide-react';

interface LetterProgressPanelProps {
  compact?: boolean;
}

export function LetterProgressPanel({ compact = false }: LetterProgressPanelProps) {
  const stats = getAllCharacterStats();
  
  // QWERTY layout
  const qwertyRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];
  
  const getCharData = (char: string): CharacterConfidence | undefined => {
    return stats.find(s => s.char === char);
  };
  
  const getKeyColor = (charData: CharacterConfidence | undefined) => {
    if (!charData) return 'bg-muted/50 text-muted-foreground';
    if (!charData.isUnlocked) return 'bg-muted/30 text-muted-foreground/50';
    
    const conf = charData.confidence;
    if (conf >= 1.0) return 'bg-success/20 text-success border-success/50';
    if (conf >= 0.8) return 'bg-primary/20 text-primary border-primary/50';
    if (conf >= 0.6) return 'bg-warning/20 text-warning border-warning/50';
    if (conf >= 0.3) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    return 'bg-destructive/20 text-destructive border-destructive/50';
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center">
        {stats.map(charData => (
          <motion.div
            key={charData.char}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-bold uppercase border",
              getKeyColor(charData)
            )}
            whileHover={{ scale: 1.1 }}
            title={`${charData.char.toUpperCase()}: ${Math.round(charData.confidence * 100)}% confidence`}
          >
            {!charData.isUnlocked ? (
              <Lock className="w-3 h-3" />
            ) : charData.confidence >= 1.0 ? (
              <Check className="w-3 h-3" />
            ) : (
              charData.char
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Letter Progress</h3>
      </div>
      
      <div className="space-y-2">
        {qwertyRows.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex justify-center gap-1.5"
            style={{ paddingLeft: rowIndex === 1 ? '16px' : rowIndex === 2 ? '32px' : '0' }}
          >
            {row.map(char => {
              const charData = getCharData(char);
              const status = charData ? getConfidenceStatus(charData.confidence, charData.isUnlocked) : null;
              
              return (
                <motion.div
                  key={char}
                  className={cn(
                    "relative w-10 h-10 rounded-lg flex flex-col items-center justify-center border transition-all cursor-default group",
                    getKeyColor(charData)
                  )}
                  whileHover={{ scale: 1.1, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  {!charData?.isUnlocked ? (
                    <Lock className="w-4 h-4 opacity-50" />
                  ) : (
                    <>
                      <span className="text-sm font-mono font-bold uppercase">{char}</span>
                      {charData && charData.confidence > 0 && (
                        <span className="text-[8px] opacity-70">
                          {Math.round(charData.confidence * 100)}%
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <div className="text-xs font-semibold uppercase">{char}</div>
                    {charData && charData.isUnlocked ? (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>WPM: {charData.wpm}</div>
                        <div>Accuracy: {charData.accuracy}%</div>
                        <div>Status: {status?.text}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Locked</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success/20 border border-success/50" />
          <span className="text-muted-foreground">Mastered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
          <span className="text-muted-foreground">Nearly there</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning/20 border border-warning/50" />
          <span className="text-muted-foreground">In progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/50" />
          <span className="text-muted-foreground">Weak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-muted-foreground">Locked</span>
        </div>
      </div>
    </motion.div>
  );
}
