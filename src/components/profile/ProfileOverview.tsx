import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Trophy, 
  Target, 
  Clock, 
  Zap, 
  BarChart3 
} from 'lucide-react';
import type { LeaderboardData, TestSession } from '@/pages/Profile';
import { StatCard } from '@/components/typing/StatCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { useMemo } from 'react';

interface ProfileOverviewProps {
  leaderboardData: LeaderboardData | null;
  testHistory: TestSession[];
  stats: {
    totalTime: number;
    avgWpm: number;
    avgAccuracy: number;
    avgConsistency: number;
    wpmTrend: number;
  } | null;
}

export function ProfileOverview({ leaderboardData, testHistory, stats }: ProfileOverviewProps) {
  // Prepare chart data
  const wpmChartData = useMemo(() => {
    return testHistory
      .slice(0, 30)
      .reverse()
      .map((test, index) => ({
        test: index + 1,
        wpm: test.net_wpm,
        accuracy: test.accuracy_percent,
        date: new Date(test.created_at).toLocaleDateString(),
      }));
  }, [testHistory]);

  // Mode distribution
  const modeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    testHistory.forEach(t => {
      counts[t.test_mode] = (counts[t.test_mode] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);
  }, [testHistory]);

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const TrendIcon = stats?.wpmTrend && stats.wpmTrend > 0 
    ? TrendingUp 
    : stats?.wpmTrend && stats.wpmTrend < 0 
      ? TrendingDown 
      : Minus;

  const trendColor = stats?.wpmTrend && stats.wpmTrend > 0 
    ? 'text-success' 
    : stats?.wpmTrend && stats.wpmTrend < 0 
      ? 'text-destructive' 
      : 'text-muted-foreground';

  if (!testHistory.length) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No tests yet</h3>
        <p className="text-muted-foreground mb-4">Complete some typing tests to see your statistics here!</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Start Typing
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Personal Best"
          value={leaderboardData?.wpm_best || 0}
          suffix="WPM"
          variant="primary"
          size="lg"
        />
        <StatCard
          label="Average WPM"
          value={Math.round(stats?.avgWpm || 0)}
          suffix="WPM"
        />
        <StatCard
          label="Avg Accuracy"
          value={Math.round(stats?.avgAccuracy || 0)}
          suffix="%"
          variant={stats?.avgAccuracy && stats.avgAccuracy >= 95 ? 'success' : 'default'}
        />
        <StatCard
          label="Consistency"
          value={Math.round(stats?.avgConsistency || 0)}
          suffix="%"
        />
      </div>

      {/* WPM Trend */}
      {stats && (
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">WPM Progress</h3>
            </div>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(stats.wpmTrend).toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wpmChartData}>
                <defs>
                  <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="test"
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
                  labelFormatter={(label) => `Test ${label}`}
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

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="stat-label">Time Typing</span>
          </div>
          <p className="text-2xl font-mono font-bold">{formatTime(stats?.totalTime || 0)}</p>
        </motion.div>
        
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="stat-label">Characters</span>
          </div>
          <p className="text-2xl font-mono font-bold">
            {(leaderboardData?.total_characters || 0).toLocaleString()}
          </p>
        </motion.div>
        
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="stat-label">Tests</span>
          </div>
          <p className="text-2xl font-mono font-bold">{testHistory.length}</p>
        </motion.div>
        
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="stat-label">Avg WPM</span>
          </div>
          <p className="text-2xl font-mono font-bold">
            {leaderboardData?.wpm_avg?.toFixed(0) || 0}
          </p>
        </motion.div>
      </div>

      {/* Mode Distribution */}
      {modeDistribution.length > 0 && (
        <motion.div 
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Tests by Mode</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="mode" 
                  width={80}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value} tests`, 'Count']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
