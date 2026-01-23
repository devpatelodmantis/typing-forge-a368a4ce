import { motion } from 'framer-motion';

interface RaceCountdownProps {
  countdown: number;
}

export const RaceCountdown = ({ countdown }: RaceCountdownProps) => {
  return (
    <motion.div
      key="countdown"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5 }}
      className="text-center"
    >
      <motion.div
        key={countdown}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        className="text-9xl font-bold text-primary"
      >
        {countdown}
      </motion.div>
      <p className="text-2xl text-muted-foreground mt-4">Get ready...</p>
    </motion.div>
  );
};
