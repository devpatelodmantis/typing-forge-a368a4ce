import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

// Mock leaderboard data - in production this would come from API/database
const mockLeaderboard = [
  { rank: 1, username: 'speedmaster', wpm: 156, accuracy: 98.5, tests: 1247 },
  { rank: 2, username: 'typingninja', wpm: 148, accuracy: 97.2, tests: 892 },
  { rank: 3, username: 'keyboardwarrior', wpm: 142, accuracy: 99.1, tests: 1456 },
  { rank: 4, username: 'flashfingers', wpm: 138, accuracy: 96.8, tests: 654 },
  { rank: 5, username: 'swiftkeys', wpm: 135, accuracy: 97.5, tests: 789 },
  { rank: 6, username: 'turbotyist', wpm: 132, accuracy: 95.9, tests: 445 },
  { rank: 7, username: 'rapidwriter', wpm: 128, accuracy: 98.2, tests: 567 },
  { rank: 8, username: 'quickstroke', wpm: 125, accuracy: 96.4, tests: 321 },
  { rank: 9, username: 'blazingkeys', wpm: 122, accuracy: 97.8, tests: 234 },
  { rank: 10, username: 'lightningtype', wpm: 119, accuracy: 95.5, tests: 445 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 text-center font-mono text-muted-foreground">{rank}</span>;
  }
};

const Leaderboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>
          
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Second Place */}
            <motion.div
              className="stat-card text-center order-1 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-center mb-2">
                <Medal className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-semibold truncate">{mockLeaderboard[1].username}</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {mockLeaderboard[1].wpm} <span className="text-sm text-muted-foreground">WPM</span>
              </p>
              <p className="text-sm text-muted-foreground">{mockLeaderboard[1].accuracy}% acc</p>
            </motion.div>
            
            {/* First Place */}
            <motion.div
              className="stat-card text-center order-0 md:order-1 border-primary/50 glow-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex justify-center mb-2">
                <Crown className="w-10 h-10 text-yellow-500" />
              </div>
              <p className="font-semibold text-lg truncate">{mockLeaderboard[0].username}</p>
              <p className="text-3xl font-mono font-bold text-primary">
                {mockLeaderboard[0].wpm} <span className="text-sm text-muted-foreground">WPM</span>
              </p>
              <p className="text-sm text-muted-foreground">{mockLeaderboard[0].accuracy}% acc</p>
            </motion.div>
            
            {/* Third Place */}
            <motion.div
              className="stat-card text-center order-2 mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex justify-center mb-2">
                <Award className="w-8 h-8 text-amber-600" />
              </div>
              <p className="font-semibold truncate">{mockLeaderboard[2].username}</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {mockLeaderboard[2].wpm} <span className="text-sm text-muted-foreground">WPM</span>
              </p>
              <p className="text-sm text-muted-foreground">{mockLeaderboard[2].accuracy}% acc</p>
            </motion.div>
          </div>
          
          {/* Full Leaderboard Table */}
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="overflow-x-auto">
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
                  {mockLeaderboard.map((user, index) => (
                    <motion.tr
                      key={user.rank}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <td className="py-4">
                        <div className="flex items-center">{getRankIcon(user.rank)}</div>
                      </td>
                      <td className="py-4">
                        <span className="font-medium">{user.username}</span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="font-mono font-bold text-primary">{user.wpm}</span>
                      </td>
                      <td className="py-4 text-right hidden md:table-cell">
                        <span className="font-mono text-muted-foreground">{user.accuracy}%</span>
                      </td>
                      <td className="py-4 text-right hidden md:table-cell">
                        <span className="text-muted-foreground">{user.tests}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
          
          {/* Coming Soon Notice */}
          <motion.div
            className="mt-8 text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-sm">
              🔜 Sign in to compete on the leaderboard and track your global ranking!
            </p>
          </motion.div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Leaderboard;
