import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, Bot } from 'lucide-react';

interface RaceResultsProps {
  isWinner: boolean;
  myWpm: number;
  myAccuracy: number;
  opponentWpm: number;
  opponentAccuracy: number;
  isBot: boolean;
  botDifficulty?: string;
}

export const RaceResults = ({
  isWinner,
  myWpm,
  myAccuracy,
  opponentWpm,
  opponentAccuracy,
  isBot,
  botDifficulty,
}: RaceResultsProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      key="finished"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <Trophy 
        className={`w-20 h-20 mx-auto mb-6 ${isWinner ? 'text-yellow-500' : 'text-muted-foreground'}`} 
      />
      <h2 className="text-3xl font-bold mb-4">
        {isWinner ? '🎉 You Won!' : 'Race Complete'}
      </h2>
      
      <div className="space-y-4 mb-8">
        {/* Your stats */}
        <div className="stat-card p-4">
          <p className="text-sm text-muted-foreground mb-2">Your Results</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold text-primary">{myWpm}</p>
              <p className="text-xs text-muted-foreground">WPM</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{myAccuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Opponent stats */}
        <div className="stat-card p-4">
          <p className="text-sm text-muted-foreground mb-2 flex items-center justify-center gap-2">
            {isBot ? (
              <>
                <Bot className="w-4 h-4" />
                {botDifficulty ? `${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)} Bot` : 'Bot'}
              </>
            ) : (
              'Opponent'
            )}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold text-destructive">{opponentWpm}</p>
              <p className="text-xs text-muted-foreground">WPM</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{opponentAccuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/race')} className="flex-1">
          New Race
        </Button>
        <Button onClick={() => navigate('/')} className="flex-1">
          Back Home
        </Button>
      </div>
    </motion.div>
  );
};
