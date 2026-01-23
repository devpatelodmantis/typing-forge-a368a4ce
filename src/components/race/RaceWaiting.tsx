import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, Copy, Loader2 } from 'lucide-react';

interface RaceWaitingProps {
  roomCode: string;
  onCopyCode: () => void;
}

export const RaceWaiting = ({ roomCode, onCopyCode }: RaceWaitingProps) => {
  return (
    <motion.div
      key="waiting"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto text-center"
    >
      <Users className="w-16 h-16 text-primary mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
      
      <div className="stat-card p-6 mb-6">
        <p className="text-muted-foreground mb-4">Share this code with your friend:</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl font-mono font-bold tracking-widest text-primary">
            {roomCode}
          </span>
          <Button variant="outline" size="icon" onClick={onCopyCode}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
    </motion.div>
  );
};
