import { motion } from 'framer-motion';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { RotateCcw, Share2, TrendingUp } from 'lucide-react';
import { type TypingStats } from '@/lib/typing-engine';
import { useTestStore } from '@/stores/test-store';
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  Area,
  AreaChart
} from 'recharts';

interface ResultsScreenProps {
  stats: TypingStats & { wpmHistory: number[] };
  onRestart: () => void;
  onNewTest: () => void;
}

export function ResultsScreen({ stats, onRestart, onNewTest }: ResultsScreenProps) {
  const { settings } = useTestStore();
  
  // Results are now saved by parent component (Index.tsx) using useTestResults hook
  // This component just displays the results
  
  // Prepare chart data
  const chartData = stats.wpmHistory.map((wpm, index) => ({
    time: index + 1,
    wpm,
  }));
  
  const getAccuracyVariant = () => {
    if (stats.accuracy >= 98) return 'success';
    if (stats.accuracy >= 95) return 'primary';
    if (stats.accuracy >= 90) return 'warning';
    return 'error';
  };
  
  const getWpmVariant = () => {
    if (stats.wpm >= 100) return 'success';
    if (stats.wpm >= 60) return 'primary';
    return 'default';
  };
  
  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="WPM" 
          value={stats.wpm} 
          variant={getWpmVariant()}
          size="lg"
        />
        <StatCard 
          label="Accuracy" 
          value={stats.accuracy} 
          suffix="%" 
          variant={getAccuracyVariant()}
          size="lg"
        />
        <StatCard 
          label="Consistency" 
          value={stats.consistency} 
          suffix="%" 
          variant="default"
        />
        <StatCard 
          label="Errors" 
          value={stats.errors} 
          variant={stats.errors === 0 ? 'success' : 'error'}
        />
      </div>
      
      {/* WPM Chart */}
      {chartData.length > 1 && (
        <motion.div
          className="stat-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">WPM over time</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value} WPM`, 'Speed']}
                  labelFormatter={(label) => `Second ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="wpm"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#wpmGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
      
      {/* Detailed Stats */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="stat-card text-center">
          <span className="stat-label">Characters</span>
          <div className="mt-2 font-mono">
            <span className="text-success">{stats.correctChars}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-destructive">{stats.incorrectChars}</span>
          </div>
        </div>
        <div className="stat-card text-center">
          <span className="stat-label">Total Chars</span>
          <div className="mt-2 font-mono text-xl font-semibold">{stats.totalChars}</div>
        </div>
        <div className="stat-card text-center">
          <span className="stat-label">Time</span>
          <div className="mt-2 font-mono text-xl font-semibold">{Math.round(stats.elapsedTime)}s</div>
        </div>
        <div className="stat-card text-center">
          <span className="stat-label">Mode</span>
          <div className="mt-2 text-xl font-semibold capitalize">{settings.mode}</div>
        </div>
      </motion.div>
      
      {/* Action Buttons */}
      <motion.div
        className="flex flex-wrap justify-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onRestart}
          variant="default"
          size="lg"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
          onClick={onNewTest}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          New Test
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </motion.div>
    </motion.div>
  );
}
