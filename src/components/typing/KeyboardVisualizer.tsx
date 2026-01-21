import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Keyboard, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface KeyboardVisualizerProps {
  currentKey?: string;
  errorKeys?: Set<string>;
  keyConfidence?: Map<string, number>;
}

// QWERTY keyboard layout
const KEYBOARD_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Ctrl', 'Alt', ' ', 'Alt', 'Ctrl'],
];

// Key widths relative to normal key (1 = 40px)
const KEY_WIDTHS: Record<string, number> = {
  'Backspace': 1.5,
  'Tab': 1.5,
  '\\': 1.5,
  'CapsLock': 1.75,
  'Enter': 2.25,
  'Shift': 2.25,
  'Ctrl': 1.25,
  'Alt': 1.25,
  ' ': 6.5,
};

// Home row markers
const HOME_ROW_KEYS = new Set(['f', 'j']);

// Get color based on confidence level - Blue theme only
function getConfidenceColor(confidence: number): string {
  if (confidence >= 1.0) return 'hsl(217 91% 50%)'; // deep blue - mastered
  if (confidence >= 0.8) return 'hsl(217 91% 60%)'; // blue - nearly there
  if (confidence >= 0.6) return 'hsl(217 80% 70%)'; // light blue - in progress
  if (confidence >= 0.3) return 'hsl(38 92% 50%)'; // warning/orange - needs work
  return 'hsl(0 60% 50%)'; // red - weak
}

// Default confidence for demo visualization
function getDefaultConfidence(key: string): number {
  const common = 'etaoinshrdlcumwfgypbvkjxqz';
  const index = common.indexOf(key.toLowerCase());
  if (index === -1) return 0.5;
  return 1 - (index / common.length) * 0.7;
}

export function KeyboardVisualizer({ 
  currentKey, 
  errorKeys = new Set(), 
  keyConfidence 
}: KeyboardVisualizerProps) {
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  
  // Track pressed keys for animation
  useMemo(() => {
    if (currentKey) {
      setPressedKeys(prev => new Set([...prev, currentKey.toLowerCase()]));
      // Remove after animation
      setTimeout(() => {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentKey.toLowerCase());
          return newSet;
        });
      }, 200);
    }
  }, [currentKey]);

  // Calculate key colors based on confidence
  const keyColors = useMemo(() => {
    const colors = new Map<string, string>();
    
    KEYBOARD_ROWS.flat().forEach(key => {
      const lowerKey = key.toLowerCase();
      let confidence: number;
      
      if (keyConfidence && keyConfidence.has(lowerKey)) {
        confidence = keyConfidence.get(lowerKey)!;
      } else if (key.length === 1 && /[a-z]/i.test(key)) {
        confidence = getDefaultConfidence(key);
      } else {
        confidence = 0.5;
      }
      
      colors.set(lowerKey, getConfidenceColor(confidence));
    });
    
    return colors;
  }, [keyConfidence]);

  return (
    <motion.div 
      className="w-full max-w-4xl mx-auto mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Toggle Control */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          {showKeyboard ? (
            <Keyboard className="w-4 h-4 text-primary" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={cn(
            "text-sm font-medium transition-colors",
            showKeyboard ? "text-primary" : "text-muted-foreground"
          )}>
            {showKeyboard ? 'Keyboard On' : 'Keyboard Off'}
          </span>
        </div>
        <Switch
          checked={showKeyboard}
          onCheckedChange={setShowKeyboard}
          className="data-[state=checked]:bg-primary"
        />
      </div>
      
      {/* Keyboard Display with AnimatePresence for smooth show/hide */}
      <AnimatePresence mode="wait">
        {showKeyboard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-b from-muted/40 to-muted/20 border border-border/50 rounded-xl p-4 md:p-6 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-1">
              {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1 justify-center">
                  {row.map((key, keyIndex) => {
                    const lowerKey = key.toLowerCase();
                    const isCurrentKey = currentKey?.toLowerCase() === lowerKey;
                    const isErrorKey = errorKeys.has(lowerKey);
                    const isPressedKey = pressedKeys.has(lowerKey);
                    const isSpace = key === ' ';
                    const isHomeRow = HOME_ROW_KEYS.has(lowerKey);
                    const width = KEY_WIDTHS[key] || 1;
                    const baseSize = 40;
                    const keyWidth = baseSize * width;
                    const bgColor = keyColors.get(lowerKey) || 'hsl(var(--muted))';
                    
                    return (
                      <motion.div
                        key={`${rowIndex}-${keyIndex}`}
                        className={cn(
                          "relative flex items-center justify-center rounded-lg border text-xs md:text-sm font-mono font-medium",
                          "h-9 md:h-10",
                          "shadow-sm transition-all duration-75",
                          isCurrentKey && "z-20",
                          isErrorKey && "border-destructive"
                        )}
                        style={{
                          width: `${keyWidth}px`,
                          backgroundColor: isSpace 
                            ? 'hsl(220 20% 25%)' 
                            : isErrorKey 
                              ? 'hsl(0 72% 50%)' 
                              : isPressedKey || isCurrentKey 
                                ? 'hsl(217 91% 55%)' 
                                : bgColor,
                          color: isPressedKey || isCurrentKey || isErrorKey
                            ? '#fff'
                            : 'hsl(var(--foreground))',
                          borderColor: isCurrentKey 
                            ? 'hsl(217 91% 60%)' 
                            : isErrorKey 
                              ? 'hsl(0 72% 50%)' 
                              : 'hsl(var(--border) / 0.5)',
                        }}
                        animate={isCurrentKey || isPressedKey ? {
                          scale: [1, 0.92, 1],
                          y: [0, 2, 0],
                          boxShadow: [
                            '0 0 0px hsl(217 91% 60% / 0)',
                            '0 0 25px hsl(217 91% 60% / 0.8), 0 0 50px hsl(217 91% 60% / 0.4)',
                            '0 0 0px hsl(217 91% 60% / 0)'
                          ]
                        } : isErrorKey ? {
                          x: [0, -3, 3, -3, 3, 0],
                          boxShadow: [
                            '0 0 0px hsl(0 72% 50% / 0)',
                            '0 0 20px hsl(0 72% 50% / 0.8)',
                            '0 0 0px hsl(0 72% 50% / 0)'
                          ]
                        } : {}}
                        transition={isCurrentKey || isPressedKey ? {
                          duration: 0.15,
                          ease: 'easeOut'
                        } : isErrorKey ? {
                          duration: 0.3,
                          ease: 'easeOut'
                        } : {}}
                      >
                        {/* Key label */}
                        <span className={cn(
                          "select-none uppercase",
                          isSpace && "text-transparent"
                        )}>
                          {key.length > 1 ? (
                            <span className="text-[10px] md:text-xs">{key}</span>
                          ) : (
                            key
                          )}
                        </span>
                        
                        {/* Home row indicator */}
                        {isHomeRow && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground/60" />
                        )}
                        
                        {/* Glow ring for active key */}
                        {(isCurrentKey || isPressedKey) && (
                          <motion.div
                            className="absolute inset-0 rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ 
                              opacity: [0, 1, 0],
                              scale: [1, 1.1, 1.2]
                            }}
                            transition={{ duration: 0.3 }}
                            style={{
                              border: '2px solid hsl(217 91% 60%)',
                              boxShadow: '0 0 15px hsl(217 91% 60% / 0.5)'
                            }}
                          />
                        )}
                        
                        {/* Error pulse ring */}
                        {isErrorKey && (
                          <motion.div
                            className="absolute inset-0 rounded-lg"
                            initial={{ opacity: 0 }}
                            animate={{ 
                              opacity: [0, 1, 0],
                              scale: [1, 1.15, 1.3]
                            }}
                            transition={{ duration: 0.4 }}
                            style={{
                              border: '2px solid hsl(0 72% 50%)',
                              boxShadow: '0 0 15px hsl(0 72% 50% / 0.6)'
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(217 91% 50%)' }} />
                <span>Mastered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(217 80% 70%)' }} />
                <span>Learning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0 60% 50%)' }} />
                <span>Weak</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
