import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Trophy, Medal, Award, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  wpm_best: number;
  accuracy_avg: number;
  tests_completed: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Award className="w-5 h-5 text-amber-600" />;
    default: return <span className="w-5 text-center font-mono text-muted-foreground">{rank}</span>;
  }
};

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data: entries } = await supabase
        .from('leaderboards')
        .select('user_id, wpm_best, accuracy_avg, tests_completed')
        .order('wpm_best', { ascending: false })
        .limit(50);

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
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No entries yet. Be the first to compete!</p>
              <a href="/auth" className="text-primary hover:underline">Sign in to start</a>
            </div>
          ) : (
            <>
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <motion.div className="stat-card text-center mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-semibold truncate">{leaderboard[1]?.username}</p>
                    <p className="text-2xl font-mono font-bold text-primary">{leaderboard[1]?.wpm_best} <span className="text-sm text-muted-foreground">WPM</span></p>
                  </motion.div>
                  <motion.div className="stat-card text-center border-primary/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                    <Crown className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                    <p className="font-semibold text-lg truncate">{leaderboard[0]?.username}</p>
                    <p className="text-3xl font-mono font-bold text-primary">{leaderboard[0]?.wpm_best} <span className="text-sm text-muted-foreground">WPM</span></p>
                  </motion.div>
                  <motion.div className="stat-card text-center mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="font-semibold truncate">{leaderboard[2]?.username}</p>
                    <p className="text-2xl font-mono font-bold text-primary">{leaderboard[2]?.wpm_best} <span className="text-sm text-muted-foreground">WPM</span></p>
                  </motion.div>
                </div>
              )}

              <motion.div className="stat-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-muted-foreground text-sm border-b border-border">
                      <th className="pb-4 font-medium w-16">Rank</th>
                      <th className="pb-4 font-medium">User</th>
                      <th className="pb-4 font-medium text-right">WPM</th>
                      <th className="pb-4 font-medium text-right hidden md:table-cell">Accuracy</th>
                      <th className="pb-4 font-medium text-right hidden md:table-cell">Tests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.user_id} className="border-b border-border/50 last:border-0">
                        <td className="py-4">{getRankIcon(index + 1)}</td>
                        <td className="py-4 font-medium">{entry.username}</td>
                        <td className="py-4 text-right font-mono font-bold text-primary">{entry.wpm_best}</td>
                        <td className="py-4 text-right hidden md:table-cell font-mono text-muted-foreground">{entry.accuracy_avg?.toFixed(1)}%</td>
                        <td className="py-4 text-right hidden md:table-cell text-muted-foreground">{entry.tests_completed}</td>
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
