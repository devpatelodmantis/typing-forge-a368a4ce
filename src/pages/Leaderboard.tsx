import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Trophy, Medal, Award, Crown, Loader2, Target, Zap, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  wpm_best: number;
  wpm_avg: number;
  accuracy_avg: number;
  consistency_avg: number;
  tests_completed: number;
  total_characters: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Award className="w-5 h-5 text-amber-600" />;
    default: return <span className="w-5 text-center font-mono text-muted-foreground">{rank}</span>;
  }
};

type LeaderboardType = 'wpm' | 'accuracy' | 'consistency' | 'tests';
type TimeFilter = 'all' | 'weekly' | 'daily';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('wpm');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      
      // Determine order column based on active tab
      let orderColumn = 'wpm_best';
      if (activeTab === 'accuracy') orderColumn = 'accuracy_avg';
      if (activeTab === 'consistency') orderColumn = 'consistency_avg';
      if (activeTab === 'tests') orderColumn = 'tests_completed';

      let query = supabase
        .from('leaderboards')
        .select('user_id, wpm_best, wpm_avg, accuracy_avg, consistency_avg, tests_completed, total_characters, updated_at')
        .order(orderColumn, { ascending: false })
        .limit(50);

      // Apply time filter
      if (timeFilter === 'daily') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('updated_at', oneDayAgo);
      } else if (timeFilter === 'weekly') {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('updated_at', oneWeekAgo);
      }

      const { data: entries } = await query;

      if (entries && entries.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', entries.map(e => e.user_id));

        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
        
        setLeaderboard(entries.map(e => ({
          ...e,
          username: profileMap.get(e.user_id) || 'Anonymous',
        })));
      } else {
        setLeaderboard([]);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [activeTab, timeFilter]);

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'wpm': return { value: entry.wpm_best, suffix: 'WPM' };
      case 'accuracy': return { value: entry.accuracy_avg?.toFixed(1), suffix: '%' };
      case 'consistency': return { value: entry.consistency_avg?.toFixed(1), suffix: '%' };
      case 'tests': return { value: entry.tests_completed, suffix: 'tests' };
    }
  };

  const tabConfig = [
    { id: 'wpm' as LeaderboardType, label: 'Speed', icon: Zap, description: 'Best WPM' },
    { id: 'accuracy' as LeaderboardType, label: 'Accuracy', icon: Target, description: 'Avg Accuracy' },
    { id: 'consistency' as LeaderboardType, label: 'Consistency', icon: Trophy, description: 'Avg Consistency' },
    { id: 'tests' as LeaderboardType, label: 'Tests', icon: Calendar, description: 'Tests Completed' },
  ];

  const timeFilters = [
    { id: 'all' as TimeFilter, label: 'All Time', icon: Trophy },
    { id: 'weekly' as TimeFilter, label: 'Weekly', icon: Calendar },
    { id: 'daily' as TimeFilter, label: 'Daily', icon: Clock },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>

          {/* Time Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {timeFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => setTimeFilter(filter.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    timeFilter === filter.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Leaderboard Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col gap-1 py-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{tab.description}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No entries yet. Be the first to compete!</p>
              <a href="/auth" className="text-primary hover:underline">Sign in to start</a>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {/* Second Place */}
                  <motion.div 
                    className="stat-card text-center mt-8" 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2 }}
                  >
                    <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-semibold truncate">{leaderboard[1]?.username}</p>
                    <p className="text-2xl font-mono font-bold text-primary">
                      {getMetricValue(leaderboard[1]).value} 
                      <span className="text-sm text-muted-foreground ml-1">{getMetricValue(leaderboard[1]).suffix}</span>
                    </p>
                  </motion.div>
                  
                  {/* First Place */}
                  <motion.div 
                    className="stat-card text-center border-primary/50" 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }}
                  >
                    <Crown className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                    <p className="font-semibold text-lg truncate">{leaderboard[0]?.username}</p>
                    <p className="text-3xl font-mono font-bold text-primary">
                      {getMetricValue(leaderboard[0]).value} 
                      <span className="text-sm text-muted-foreground ml-1">{getMetricValue(leaderboard[0]).suffix}</span>
                    </p>
                  </motion.div>
                  
                  {/* Third Place */}
                  <motion.div 
                    className="stat-card text-center mt-12" 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }}
                  >
                    <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="font-semibold truncate">{leaderboard[2]?.username}</p>
                    <p className="text-2xl font-mono font-bold text-primary">
                      {getMetricValue(leaderboard[2]).value} 
                      <span className="text-sm text-muted-foreground ml-1">{getMetricValue(leaderboard[2]).suffix}</span>
                    </p>
                  </motion.div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <motion.div 
                className="stat-card" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.4 }}
              >
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground text-sm border-b border-border">
                      <th className="pb-4 font-medium w-16">Rank</th>
                      <th className="pb-4 font-medium">User</th>
                      <th className="pb-4 font-medium text-right">
                        {activeTab === 'wpm' && 'Best WPM'}
                        {activeTab === 'accuracy' && 'Accuracy'}
                        {activeTab === 'consistency' && 'Consistency'}
                        {activeTab === 'tests' && 'Tests'}
                      </th>
                      <th className="pb-4 font-medium text-right hidden md:table-cell">Avg WPM</th>
                      <th className="pb-4 font-medium text-right hidden md:table-cell">Characters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.user_id} className="border-b border-border/50 last:border-0">
                        <td className="py-4">{getRankIcon(index + 1)}</td>
                        <td className="py-4 font-medium">{entry.username}</td>
                        <td className="py-4 text-right font-mono font-bold text-primary">
                          {getMetricValue(entry).value}
                          <span className="text-xs text-muted-foreground ml-1">{getMetricValue(entry).suffix}</span>
                        </td>
                        <td className="py-4 text-right hidden md:table-cell font-mono text-muted-foreground">
                          {entry.wpm_avg?.toFixed(0)}
                        </td>
                        <td className="py-4 text-right hidden md:table-cell text-muted-foreground">
                          {entry.total_characters?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
