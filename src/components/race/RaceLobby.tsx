import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swords, Play, Bot, Users } from 'lucide-react';
import { BotDifficulty } from '@/lib/bot-engine';

interface RaceLobbyProps {
  user: any;
  onCreateRace: () => void;
  onJoinRace: (code: string) => void;
  onCreateBotRace: (difficulty: BotDifficulty) => void;
}

const difficultyConfig: Record<BotDifficulty, { label: string; description: string; color: string }> = {
  beginner: {
    label: 'Beginner Bot',
    description: '20-40 WPM, makes frequent mistakes',
    color: 'text-green-500',
  },
  intermediate: {
    label: 'Intermediate Bot',
    description: '35-65 WPM, moderate accuracy',
    color: 'text-yellow-500',
  },
  pro: {
    label: 'Pro Bot',
    description: '65-100 WPM, highly accurate',
    color: 'text-red-500',
  },
};

export const RaceLobby = ({ user, onCreateRace, onJoinRace, onCreateBotRace }: RaceLobbyProps) => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [showBotOptions, setShowBotOptions] = useState(false);

  return (
    <motion.div
      key="lobby"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto text-center"
    >
      {/* Removed duplicate title - now in Race.tsx */}

      {/* Race vs Human */}
      <div className="stat-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Race vs Human</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Create or join a race with a friend
        </p>
        <div className="flex gap-2 mb-4">
          <Button onClick={onCreateRace} className="flex-1" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Create Race
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="text-center font-mono text-lg"
            maxLength={6}
          />
          <Button onClick={() => onJoinRace(joinCode)} disabled={joinCode.length !== 6}>
            Join
          </Button>
        </div>
      </div>

      {/* Race vs Bot */}
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Race vs Bot</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Practice against AI opponents
        </p>
        
        {!showBotOptions ? (
          <Button 
            onClick={() => setShowBotOptions(true)} 
            variant="outline" 
            className="w-full" 
            size="lg"
          >
            <Bot className="w-4 h-4 mr-2" />
            Choose Bot Difficulty
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            {(Object.keys(difficultyConfig) as BotDifficulty[]).map((difficulty) => (
              <Button
                key={difficulty}
                onClick={() => onCreateBotRace(difficulty)}
                variant="outline"
                className="w-full justify-between"
              >
                <span className={difficultyConfig[difficulty].color}>
                  {difficultyConfig[difficulty].label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {difficultyConfig[difficulty].description}
                </span>
              </Button>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowBotOptions(false)}
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </div>

      {!user && (
        <p className="mt-6 text-muted-foreground">
          <a href="/auth" className="text-primary hover:underline">Sign in</a> to race against others
        </p>
      )}
    </motion.div>
  );
};
