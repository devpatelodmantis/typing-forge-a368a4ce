import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { CharacterGrid } from '@/components/profile/CharacterGrid';
import { TestHistory } from '@/components/profile/TestHistory';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { 
  LayoutDashboard, 
  Clock, 
  Keyboard, 
  Settings, 
  Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  target_wpm: number;
  theme: string;
  created_at: string;
}

export interface LeaderboardData {
  wpm_best: number;
  wpm_avg: number;
  accuracy_avg: number;
  consistency_avg: number;
  tests_completed: number;
  total_characters: number;
}

export interface CharacterConfidence {
  character: string;
  confidence_level: number;
  current_wpm: number;
  current_accuracy: number;
  total_instances: number;
  lessons_practiced: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

export interface TestSession {
  id: string;
  test_mode: string;
  duration_seconds: number;
  gross_wpm: number;
  net_wpm: number;
  accuracy_percent: number;
  consistency_percent: number;
  total_characters: number;
  correct_characters: number;
  error_count: number;
  created_at: string;
  wpm_history: number[];
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [characterData, setCharacterData] = useState<CharacterConfidence[]>([]);
  const [testHistory, setTestHistory] = useState<TestSession[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch leaderboard entry
        const { data: leaderboard } = await supabase
          .from('leaderboards')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (leaderboard) {
          setLeaderboardData(leaderboard);
        }

        // Fetch character confidence
        const { data: characters } = await supabase
          .from('character_confidence')
          .select('*')
          .eq('user_id', user.id)
          .order('character');

        if (characters) {
          setCharacterData(characters);
        }

        // Fetch test history
        const { data: tests } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (tests) {
          setTestHistory(tests.map(t => ({
            ...t,
            wpm_history: Array.isArray(t.wpm_history) ? t.wpm_history as number[] : [],
          })));
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user]);

  // Calculate additional stats
  const stats = useMemo(() => {
    if (!testHistory.length) return null;

    const totalTime = testHistory.reduce((acc, t) => acc + t.duration_seconds, 0);
    const avgWpm = testHistory.reduce((acc, t) => acc + t.net_wpm, 0) / testHistory.length;
    const avgAccuracy = testHistory.reduce((acc, t) => acc + t.accuracy_percent, 0) / testHistory.length;
    const avgConsistency = testHistory.reduce((acc, t) => acc + (t.consistency_percent || 0), 0) / testHistory.length;

    // WPM trend (compare last 10 to previous 10)
    const recent = testHistory.slice(0, 10);
    const previous = testHistory.slice(10, 20);
    const recentAvg = recent.reduce((acc, t) => acc + t.net_wpm, 0) / (recent.length || 1);
    const previousAvg = previous.length > 0 
      ? previous.reduce((acc, t) => acc + t.net_wpm, 0) / previous.length 
      : recentAvg;
    const wpmTrend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      totalTime,
      avgWpm,
      avgAccuracy,
      avgConsistency,
      wpmTrend,
    };
  }, [testHistory]);

  if (authLoading || loading) {
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

  if (!user || !profile) {
    return null;
  }

  const tabConfig = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tests', label: 'Test History', icon: Clock },
    { id: 'characters', label: 'Characters', icon: Keyboard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Header */}
          <ProfileHeader 
            profile={profile} 
            leaderboardData={leaderboardData}
            testsCompleted={testHistory.length}
          />

          {/* Profile Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="grid w-full grid-cols-4 h-auto mb-8">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 py-3">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview">
              <ProfileOverview 
                leaderboardData={leaderboardData}
                testHistory={testHistory}
                stats={stats}
              />
            </TabsContent>

            <TabsContent value="tests">
              <TestHistory testHistory={testHistory} />
            </TabsContent>

            <TabsContent value="characters">
              <CharacterGrid characterData={characterData} />
            </TabsContent>

            <TabsContent value="settings">
              <ProfileSettings 
                profile={profile} 
                onUpdate={(updated) => setProfile(updated)} 
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
