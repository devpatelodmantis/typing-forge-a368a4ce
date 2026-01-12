import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatCard } from '@/components/typing/StatCard';
import { getTestHistory, getPersonalBest, type TestResult } from '@/lib/typing-engine';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Target, Zap, Calendar } from 'lucide-react';

const Stats = () => {
  const history = useMemo(() => getTestHistory(), []);
  const personalBest = useMemo(() => getPersonalBest(), []);
  
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    
    const totalTests = history.length;
    const avgWpm = Math.round(history.reduce((acc, t) => acc + t.wpm, 0) / totalTests);
    const avgAccuracy = Math.round(history.reduce((acc, t) => acc + t.accuracy, 0) / totalTests);
    const totalChars = history.reduce((acc, t) => acc + t.totalChars, 0);
    const totalTime = history.reduce((acc, t) => acc + t.duration, 0);
    
    return {
      totalTests,
      avgWpm,
      avgAccuracy,
      totalChars,
      totalTime,
    };
  }, [history]);
  
  // Prepare chart data (last 20 tests, reversed for chronological order)
  const chartData = useMemo(() => {
    return history
      .slice(0, 20)
      .reverse()
      .map((test, index) => ({
        test: index + 1,
        wpm: test.wpm,
        accuracy: test.accuracy,
        date: new Date(test.date).toLocaleDateString(),
      }));
  }, [history]);
  
  if (history.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-4">Your Statistics</h1>
            <p className="text-muted-foreground mb-8">
              Complete your first typing test to see your stats here!
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Start Typing
            </a>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8">Your Statistics</h1>
          
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Personal Best"
              value={personalBest?.wpm || 0}
              suffix="WPM"
              variant="primary"
              size="lg"
            />
            <StatCard
              label="Average WPM"
              value={stats?.avgWpm || 0}
              suffix="WPM"
            />
            <StatCard
              label="Avg Accuracy"
              value={stats?.avgAccuracy || 0}
              suffix="%"
              variant={stats?.avgAccuracy && stats.avgAccuracy >= 95 ? 'success' : 'default'}
            />
            <StatCard
              label="Tests Completed"
              value={stats?.totalTests || 0}
            />
          </div>
          
          {/* WPM Trend Chart */}
          {chartData.length > 1 && (
            <motion.div
              className="stat-card mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">WPM Progress</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
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
          
          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="stat-label">Total Characters</span>
              </div>
              <p className="text-2xl font-mono font-bold">{stats?.totalChars.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="stat-label">Time Typing</span>
              </div>
              <p className="text-2xl font-mono font-bold">
                {Math.round((stats?.totalTime || 0) / 60)}m
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="stat-label">Best Accuracy</span>
              </div>
              <p className="text-2xl font-mono font-bold">{personalBest?.accuracy || 0}%</p>
            </div>
          </div>
          
          {/* Recent Tests */}
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4">Recent Tests</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted-foreground text-sm">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">WPM</th>
                    <th className="pb-3 font-medium">Accuracy</th>
                    <th className="pb-3 font-medium">Mode</th>
                    <th className="pb-3 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((test) => (
                    <tr key={test.id} className="border-t border-border">
                      <td className="py-3 text-sm">
                        {new Date(test.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-mono font-semibold text-primary">
                        {test.wpm}
                      </td>
                      <td className="py-3 font-mono">
                        <span
                          className={
                            test.accuracy >= 98
                              ? 'text-success'
                              : test.accuracy >= 95
                              ? 'text-warning'
                              : 'text-destructive'
                          }
                        >
                          {test.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 text-sm capitalize">{test.mode}</td>
                      <td className="py-3 text-sm text-muted-foreground">{test.duration}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Stats;
