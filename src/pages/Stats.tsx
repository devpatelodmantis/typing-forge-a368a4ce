import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatsFilter } from '@/components/stats/StatsFilter';
import { StatsSummary } from '@/components/stats/StatsSummary';
import { AccuracyStreaks } from '@/components/stats/AccuracyStreaks';
import { SpeedHistogram } from '@/components/stats/SpeedHistogram';
import { LearningProgressChart, TypingSpeedChart } from '@/components/stats/LearningProgressChart';
import { KeySpeedChart, KeySpeedHistogram } from '@/components/stats/KeySpeedChart';
import { KeyFrequencyHistogram, KeyFrequencyHeatmap } from '@/components/stats/KeyFrequencyCharts';
import { PracticeCalendar } from '@/components/stats/PracticeCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo, useEffect } from 'react';
import { Zap, BarChart3, Keyboard, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTestHistory, getPersonalBest } from '@/lib/typing-engine';
import { getAllCharacterStats, getCharacterData } from '@/lib/keybr-engine';
import { useNavigate } from 'react-router-dom';

interface TestSession {
  id: string;
  created_at: string | null;
  net_wpm: number | null;
  accuracy_percent: number | null;
  consistency_percent: number | null;
  duration_seconds: number;
  test_mode: string;
  total_characters: number | null;
  correct_characters: number | null;
  error_count: number | null;
  per_char_metrics: unknown;
}

const Stats = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Filter states
  const [language, setLanguage] = useState('en-US');
  const [contentType, setContentType] = useState('letters');
  const [timePeriod, setTimePeriod] = useState('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from database or localStorage
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      if (user) {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setTestSessions(data as unknown as TestSession[]);
        }
      } else {
        // Use localStorage data
        const localHistory = getTestHistory();
        setTestSessions(localHistory.map((t, i) => ({
          id: t.id,
          created_at: t.date,
          net_wpm: t.wpm,
          accuracy_percent: t.accuracy,
          consistency_percent: t.consistency,
          duration_seconds: t.duration,
          test_mode: t.mode,
          total_characters: t.totalChars,
          correct_characters: t.correctChars,
          error_count: t.errors,
          per_char_metrics: null,
        })));
      }
      
      setIsLoading(false);
    };
    
    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  // Filter tests by time period
  const filteredTests = useMemo(() => {
    let filtered = [...testSessions].filter(t => t.created_at); // Filter out null dates
    
    const now = new Date();
    if (timePeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => t.created_at && new Date(t.created_at) >= weekAgo);
    } else if (timePeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => t.created_at && new Date(t.created_at) >= monthAgo);
    } else if (timePeriod === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => t.created_at && new Date(t.created_at) >= yearAgo);
    }
    
    // Filter by content type (mode)
    if (contentType !== 'letters') {
      filtered = filtered.filter(t => t.test_mode.toLowerCase().includes(contentType));
    }
    
    return filtered;
  }, [testSessions, timePeriod, contentType]);

  // Calculate all-time stats
  const allTimeStats = useMemo(() => {
    if (filteredTests.length === 0) {
      return {
        totalTime: 0,
        lessonsCount: 0,
        topSpeed: 0,
        avgSpeed: 0,
        topAccuracy: 0,
        avgAccuracy: 0,
      };
    }
    
    const totalTime = filteredTests.reduce((sum, t) => sum + t.duration_seconds, 0);
    const topSpeed = Math.max(...filteredTests.map(t => t.net_wpm || 0));
    const avgSpeed = filteredTests.reduce((sum, t) => sum + (t.net_wpm || 0), 0) / filteredTests.length;
    const topAccuracy = Math.max(...filteredTests.map(t => t.accuracy_percent || 0));
    const avgAccuracy = filteredTests.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) / filteredTests.length;
    
    return {
      totalTime,
      lessonsCount: filteredTests.length,
      topSpeed,
      avgSpeed,
      topAccuracy,
      avgAccuracy,
    };
  }, [filteredTests]);

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTests = testSessions.filter(t => t.created_at && new Date(t.created_at) >= today);
    
    if (todayTests.length === 0) {
      return {
        totalTime: 0,
        lessonsCount: 0,
        topSpeed: 0,
        avgSpeed: 0,
        topAccuracy: 0,
        avgAccuracy: 0,
      };
    }
    
    const totalTime = todayTests.reduce((sum, t) => sum + t.duration_seconds, 0);
    const topSpeed = Math.max(...todayTests.map(t => t.net_wpm || 0));
    const avgSpeed = todayTests.reduce((sum, t) => sum + (t.net_wpm || 0), 0) / todayTests.length;
    const topAccuracy = Math.max(...todayTests.map(t => t.accuracy_percent || 0));
    const avgAccuracy = todayTests.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) / todayTests.length;
    
    return {
      totalTime,
      lessonsCount: todayTests.length,
      topSpeed,
      avgSpeed,
      topAccuracy,
      avgAccuracy,
    };
  }, [testSessions]);

  // Calculate accuracy streaks
  const accuracyStreaks = useMemo(() => {
    const thresholds = [100, 98, 95, 90];
    const streaks: { threshold: number; count: number; avgWpm: number; avgAccuracy: number; startDate: string; endDate: string }[] = [];
    
    thresholds.forEach(threshold => {
      let currentStreak: TestSession[] = [];
      let longestStreak: TestSession[] = [];
      
      filteredTests.forEach(test => {
        if ((test.accuracy_percent || 0) >= threshold) {
          currentStreak.push(test);
          if (currentStreak.length > longestStreak.length) {
            longestStreak = [...currentStreak];
          }
        } else {
          currentStreak = [];
        }
      });
      
      if (longestStreak.length >= 3) {
        const avgWpm = longestStreak.reduce((sum, t) => sum + (t.net_wpm || 0), 0) / longestStreak.length;
        const avgAccuracy = longestStreak.reduce((sum, t) => sum + (t.accuracy_percent || 0), 0) / longestStreak.length;
        
        streaks.push({
          threshold,
          count: longestStreak.length,
          avgWpm,
          avgAccuracy,
          startDate: longestStreak[0].created_at ? new Date(longestStreak[0].created_at).toLocaleDateString() : 'N/A',
          endDate: longestStreak[longestStreak.length - 1].created_at ? new Date(longestStreak[longestStreak.length - 1].created_at).toLocaleDateString() : 'N/A',
        });
      }
    });
    
    return streaks;
  }, [filteredTests]);

  // Generate speed distribution for histogram
  const speedDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', rangeStart: 0, rangeEnd: 20, count: 0 },
      { range: '20-40', rangeStart: 20, rangeEnd: 40, count: 0 },
      { range: '40-60', rangeStart: 40, rangeEnd: 60, count: 0 },
      { range: '60-80', rangeStart: 60, rangeEnd: 80, count: 0 },
      { range: '80-100', rangeStart: 80, rangeEnd: 100, count: 0 },
      { range: '100-120', rangeStart: 100, rangeEnd: 120, count: 0 },
      { range: '120+', rangeStart: 120, rangeEnd: 999, count: 0 },
    ];
    
    // Simulate user distribution (in real app, fetch from API)
    const simulatedDistribution = [5, 15, 30, 25, 15, 7, 3];
    buckets.forEach((bucket, i) => {
      bucket.count = simulatedDistribution[i];
    });
    
    return buckets;
  }, []);

  // Calculate percentile
  const percentileBeat = useMemo(() => {
    if (allTimeStats.avgSpeed === 0) return 0;
    
    // Simulate percentile based on average speed
    const speed = allTimeStats.avgSpeed;
    if (speed >= 120) return 97;
    if (speed >= 100) return 90;
    if (speed >= 80) return 75;
    if (speed >= 60) return 55;
    if (speed >= 40) return 30;
    if (speed >= 20) return 10;
    return 5;
  }, [allTimeStats.avgSpeed]);

  // Prepare lesson data for charts
  const lessonData = useMemo(() => {
    return filteredTests.map((t, i) => ({
      lesson: i + 1,
      wpm: t.net_wpm || 0,
      accuracy: t.accuracy_percent || 0,
      keysCount: Math.floor((t.total_characters || 0) / 10),
    }));
  }, [filteredTests]);

  // Get character stats from localStorage (keybr engine)
  const characterStats = useMemo(() => {
    const charData = getCharacterData();
    return Object.entries(charData).map(([key, data]) => ({
      key,
      lastSpeed: data.wpm || 0,
      topSpeed: data.wpm || 0,
      avgSpeed: data.wpm || 0,
      learningRate: data.confidence >= 0.8 ? 'stable' as const : 
                    data.confidence >= 0.5 ? 'improving' as const : 'uncertain' as const,
      history: [{ lesson: 1, wpm: data.wpm || 0 }],
    }));
  }, [filteredTests]);

  // Key frequency data
  const keyFrequencies = useMemo(() => {
    const charData = getCharacterData();
    return Object.entries(charData).map(([key, data]) => ({
      key,
      hits: data.occurrences || 0,
      misses: Math.round((data.occurrences || 0) * (1 - (data.accuracy || 0) / 100)),
      missRatio: 1 - (data.accuracy || 100) / 100,
    }));
  }, []);

  // Practice calendar data
  const calendarActivities = useMemo(() => {
    const activityMap = new Map<string, { lessonsCompleted: number; dailyGoalPercent: number }>();
    
    testSessions.forEach(t => {
      if (!t.created_at) return; // Skip null dates
      const date = new Date(t.created_at).toISOString().split('T')[0];
      const existing = activityMap.get(date) || { lessonsCompleted: 0, dailyGoalPercent: 0 };
      existing.lessonsCompleted++;
      existing.dailyGoalPercent = Math.min(100, existing.lessonsCompleted * 10);
      activityMap.set(date, existing);
    });
    
    return Array.from(activityMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [testSessions]);

  // Key progress data for learning progress chart
  const keyProgressData = useMemo(() => {
    const unlockedKeys = characterStats
      .filter(k => k.avgSpeed > 0)
      .slice(0, 10)
      .map(k => k.key);
    
    return lessonData.slice(0, 20).map((lesson, i) => {
      const entry: { lesson: number; [key: string]: number } = { lesson: i + 1 };
      unlockedKeys.forEach(key => {
        entry[key] = Math.random() * 50 + 30; // Simulated per-key speed
      });
      return entry;
    });
  }, [lessonData, characterStats]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (testSessions.length === 0) {
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
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Start Typing
            </button>
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
          <h1 className="text-3xl font-bold mb-6">Your Statistics</h1>
          
          {/* Filters */}
          <StatsFilter
            language={language}
            setLanguage={setLanguage}
            contentType={contentType}
            setContentType={setContentType}
            timePeriod={timePeriod}
            setTimePeriod={setTimePeriod}
          />
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="speed" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Speed</span>
              </TabsTrigger>
              <TabsTrigger value="keys" className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                <span className="hidden sm:inline">Keys</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Stats */}
              <div className="grid md:grid-cols-2 gap-6">
                <StatsSummary
                  title="All Time Statistics"
                  {...allTimeStats}
                />
                <StatsSummary
                  title="Statistics for Today"
                  {...todayStats}
                />
              </div>
              
              {/* Accuracy Streaks */}
              <AccuracyStreaks streaks={accuracyStreaks} />
              
              {/* Speed Histogram */}
              <SpeedHistogram
                userAvgSpeed={allTimeStats.avgSpeed}
                userTopSpeed={allTimeStats.topSpeed}
                distribution={speedDistribution}
                percentileBeat={percentileBeat}
              />
            </TabsContent>
            
            <TabsContent value="speed" className="space-y-6">
              {/* Learning Progress */}
              <LearningProgressChart
                lessonData={lessonData}
                keyProgressData={keyProgressData}
                unlockedKeys={characterStats.filter(k => k.avgSpeed > 0).map(k => k.key)}
              />
              
              {/* Typing Speed Chart */}
              <TypingSpeedChart lessonData={lessonData} />
              
              {/* Key Speed Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <KeySpeedChart
                  keyData={characterStats}
                  targetWpm={35}
                  selectedKey={selectedKey}
                  onSelectKey={setSelectedKey}
                />
                <KeySpeedHistogram keyData={characterStats} />
              </div>
            </TabsContent>
            
            <TabsContent value="keys" className="space-y-6">
              {/* Key Frequency Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <KeyFrequencyHistogram frequencies={keyFrequencies} />
                <KeyFrequencyHeatmap frequencies={keyFrequencies} />
              </div>
            </TabsContent>
            
            <TabsContent value="calendar" className="space-y-6">
              {/* Practice Calendar */}
              <PracticeCalendar activities={calendarActivities} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Stats;
