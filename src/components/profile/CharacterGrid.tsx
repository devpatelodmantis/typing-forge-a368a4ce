import { motion } from 'framer-motion';
import { Lock, Unlock, Zap, Keyboard } from 'lucide-react';
import type { CharacterConfidence } from '@/pages/Profile';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface CharacterGridProps {
  characterData: CharacterConfidence[];
}

const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// QWERTY keyboard layout
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const getConfidenceColor = (confidence: number, isUnlocked: boolean) => {
  if (!isUnlocked && confidence < 0.3) return 'bg-muted border-border';
  if (confidence >= 1.0) return 'bg-green-500/20 border-green-500/50';
  if (confidence >= 0.8) return 'bg-emerald-500/20 border-emerald-500/50';
  if (confidence >= 0.6) return 'bg-yellow-500/20 border-yellow-500/50';
  if (confidence >= 0.3) return 'bg-orange-500/20 border-orange-500/50';
  return 'bg-red-500/20 border-red-500/50';
};

const getConfidenceTextColor = (confidence: number, isUnlocked: boolean) => {
  if (!isUnlocked && confidence < 0.3) return 'text-muted-foreground';
  if (confidence >= 1.0) return 'text-green-500';
  if (confidence >= 0.8) return 'text-emerald-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  if (confidence >= 0.3) return 'text-orange-500';
  return 'text-red-500';
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 1.0) return 'Mastered';
  if (confidence >= 0.8) return 'Nearly Unlocked';
  if (confidence >= 0.6) return 'In Progress';
  if (confidence >= 0.3) return 'Needs Work';
  return 'Weak';
};

export function CharacterGrid({ characterData }: CharacterGridProps) {
  const [selectedChar, setSelectedChar] = useState<CharacterConfidence | null>(null);

  // Create a map of character data
  const charMap = new Map(characterData.map(c => [c.character.toLowerCase(), c]));

  // Get or create default character data
  const getCharData = (char: string): CharacterConfidence => {
    const existing = charMap.get(char);
    if (existing) return existing;
    return {
      character: char,
      confidence_level: 0,
      current_wpm: 0,
      current_accuracy: 0,
      total_instances: 0,
      lessons_practiced: 0,
      is_unlocked: false,
      unlocked_at: null,
    };
  };

  if (characterData.length === 0) {
    return (
      <div className="text-center py-12">
        <Keyboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No character data yet</h3>
        <p className="text-muted-foreground mb-4">
          Practice in Learn mode to track your character confidence!
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Start Learning
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          className="stat-card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-3xl font-bold text-primary">
            {characterData.filter(c => c.is_unlocked).length}
          </p>
          <p className="text-sm text-muted-foreground">Unlocked</p>
        </motion.div>
        <motion.div 
          className="stat-card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-3xl font-bold text-emerald-500">
            {characterData.filter(c => c.confidence_level >= 0.8 && !c.is_unlocked).length}
          </p>
          <p className="text-sm text-muted-foreground">Nearly Unlocked</p>
        </motion.div>
        <motion.div 
          className="stat-card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-3xl font-bold text-yellow-500">
            {characterData.filter(c => c.confidence_level >= 0.3 && c.confidence_level < 0.8).length}
          </p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </motion.div>
        <motion.div 
          className="stat-card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-3xl font-bold text-red-500">
            {characterData.filter(c => c.confidence_level < 0.3).length}
          </p>
          <p className="text-sm text-muted-foreground">Needs Work</p>
        </motion.div>
      </div>

      {/* Keyboard Layout */}
      <motion.div 
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary" />
          Character Confidence
        </h3>
        
        <div className="space-y-2">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              className="flex justify-center gap-2"
              style={{ marginLeft: `${rowIndex * 20}px` }}
            >
              {row.map((char) => {
                const data = getCharData(char);
                const confidence = data.confidence_level || 0;
                
                return (
                  <motion.button
                    key={char}
                    onClick={() => setSelectedChar(data)}
                    className={cn(
                      'relative w-12 h-14 md:w-14 md:h-16 rounded-lg border-2 transition-all',
                      'flex flex-col items-center justify-center',
                      'hover:scale-105 cursor-pointer',
                      getConfidenceColor(confidence, data.is_unlocked)
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Lock/Unlock indicator */}
                    <div className="absolute -top-1 -right-1">
                      {data.is_unlocked ? (
                        <Unlock className="w-3 h-3 text-green-500" />
                      ) : confidence >= 0.8 ? (
                        <Zap className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Letter */}
                    <span className={cn(
                      'text-xl font-bold uppercase',
                      getConfidenceTextColor(confidence, data.is_unlocked)
                    )}>
                      {char}
                    </span>
                    
                    {/* Progress bar */}
                    <div className="w-8 h-1 bg-background/50 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={cn(
                          'h-full rounded-full transition-all',
                          confidence >= 1.0 ? 'bg-green-500' :
                          confidence >= 0.8 ? 'bg-emerald-500' :
                          confidence >= 0.6 ? 'bg-yellow-500' :
                          confidence >= 0.3 ? 'bg-orange-500' : 'bg-red-500'
                        )}
                        style={{ width: `${Math.min(100, confidence * 100)}%` }}
                      />
                    </div>
                    
                    {/* WPM */}
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {data.current_wpm?.toFixed(0) || 0}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Character Detail Modal */}
      <Dialog open={!!selectedChar} onOpenChange={() => setSelectedChar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">
              <span className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold uppercase',
                getConfidenceColor(selectedChar?.confidence_level || 0, selectedChar?.is_unlocked || false)
              )}>
                {selectedChar?.character}
              </span>
              <div>
                <p className="text-sm text-muted-foreground">
                  {getConfidenceLabel(selectedChar?.confidence_level || 0)}
                </p>
                <p className="text-2xl font-bold">
                  {((selectedChar?.confidence_level || 0) * 100).toFixed(0)}% Confidence
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card text-center">
                <p className="text-2xl font-bold font-mono text-primary">
                  {selectedChar?.current_wpm?.toFixed(1) || 0}
                </p>
                <p className="text-sm text-muted-foreground">WPM</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold font-mono">
                  {selectedChar?.current_accuracy?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold font-mono">
                  {selectedChar?.total_instances || 0}
                </p>
                <p className="text-sm text-muted-foreground">Times Typed</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold font-mono">
                  {selectedChar?.lessons_practiced || 0}
                </p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
            </div>

            {/* Unlock Progress */}
            {!selectedChar?.is_unlocked && (
              <div className="space-y-4">
                <h4 className="font-semibold">Unlock Progress</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Speed</span>
                      <span>{selectedChar?.current_wpm?.toFixed(0) || 0} / 35 WPM</span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((selectedChar?.current_wpm || 0) / 35) * 100)} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Accuracy</span>
                      <span>{selectedChar?.current_accuracy?.toFixed(0) || 0} / 95%</span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((selectedChar?.current_accuracy || 0) / 95) * 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Reach 35 WPM with 95% accuracy to unlock this character!
                </p>
              </div>
            )}

            {selectedChar?.is_unlocked && selectedChar?.unlocked_at && (
              <p className="text-center text-sm text-muted-foreground">
                🎉 Unlocked on {new Date(selectedChar.unlocked_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
