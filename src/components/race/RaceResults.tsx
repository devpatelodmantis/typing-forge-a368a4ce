import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, Bot, RotateCcw, Home } from 'lucide-react';

interface RaceResultsProps {
  isWinner: boolean;
  myWpm: number;
  myAccuracy: number;
  opponentWpm: number;
  opponentAccuracy: number;
  isBot: boolean;
  botDifficulty?: string;
  onPlayAgain?: () => void;
}

export const RaceResults = ({
  isWinner,
  myWpm,
  myAccuracy,
  opponentWpm,
  opponentAccuracy,
  isBot,
  botDifficulty,
  onPlayAgain,
}: RaceResultsProps) => {
  const navigate = useNavigate();

  const handlePlayAgain = () => {
    if (onPlayAgain) {
      onPlayAgain();
    } else {
      navigate('/race');
    }
  };

  return (
    <motion.div
      key="finished"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <Trophy 
          className={`w-20 h-20 mx-auto mb-6 ${isWinner ? 'text-yellow-500' : 'text-muted-foreground'}`} 
        />
      </motion.div>
      
      <motion.h2 
        className="text-3xl font-bold mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {isWinner ? '🎉 Victory!' : 'Race Complete'}
      </motion.h2>
      
      <motion.p 
        className="text-muted-foreground mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {isWinner 
          ? 'Congratulations! You outpaced your opponent!' 
          : 'Great effort! Keep practicing to improve.'}
      </motion.p>
      
      <motion.div 
        className="space-y-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Your stats */}
        <div className="stat-card p-5 border-primary/30">
          <p className="text-sm text-primary font-medium mb-3">Your Results</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-4xl font-bold text-primary font-mono">{myWpm}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">WPM</p>
            </div>
            <div>
              <p className={`text-4xl font-bold font-mono ${myAccuracy >= 95 ? 'text-primary' : myAccuracy >= 90 ? 'text-warning' : 'text-destructive'}`}>
                {myAccuracy.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Opponent stats */}
        <div className="stat-card p-5 border-destructive/30">
          <p className="text-sm text-muted-foreground font-medium mb-3 flex items-center justify-center gap-2">
            {isBot ? (
              <>
                <Bot className="w-4 h-4" />
                {botDifficulty ? `${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)} Bot` : 'Bot'}
              </>
            ) : (
              'Opponent'
            )}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-4xl font-bold text-destructive font-mono">{opponentWpm}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">WPM</p>
            </div>
            <div>
              <p className="text-4xl font-bold font-mono">{opponentAccuracy.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Accuracy</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button 
          variant="outline" 
          onClick={handlePlayAgain} 
          className="flex-1 gap-2"
          size="lg"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again
        </Button>
        <Button 
          onClick={() => navigate('/')} 
          className="flex-1 gap-2"
          size="lg"
        >
          <Home className="w-4 h-4" />
          Home
        </Button>
      </motion.div>
    </motion.div>
  );
};
