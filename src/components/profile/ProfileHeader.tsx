import { motion } from 'framer-motion';
import { User, Calendar, Trophy, Target, Zap } from 'lucide-react';
import type { ProfileData, LeaderboardData } from '@/pages/Profile';
import { formatDistanceToNow } from 'date-fns';

interface ProfileHeaderProps {
  profile: ProfileData;
  leaderboardData: LeaderboardData | null;
  testsCompleted: number;
}

export function ProfileHeader({ profile, leaderboardData, testsCompleted }: ProfileHeaderProps) {
  const memberSince = formatDistanceToNow(new Date(profile.created_at), { addSuffix: true });

  return (
    <motion.div 
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.username} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-success-foreground" />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{profile.username}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {memberSince}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              Target: {profile.target_wpm} WPM
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-6 md:gap-8">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold font-mono text-primary">
              {leaderboardData?.wpm_best || 0}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" /> Best WPM
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold font-mono">
              {leaderboardData?.accuracy_avg?.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Target className="w-3 h-3" /> Accuracy
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold font-mono">
              {testsCompleted}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" /> Tests
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
