import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { saveTestResult, type TestResult, type TypingStats } from '@/lib/typing-engine';

interface PerCharMetric {
  char: string;
  wpm: number;
  accuracy: number;
  confidence: number;
  occurrences: number;
}

export function useTestResults() {
  const { user } = useAuth();

  const saveResult = useCallback(async (
    stats: TypingStats & { wpmHistory: number[] },
    mode: string,
    duration: number
  ) => {
    // Always save to localStorage
    const localResult: TestResult = {
      id: crypto.randomUUID(),
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      consistency: stats.consistency,
      mode,
      duration,
      correctChars: stats.correctChars,
      incorrectChars: stats.incorrectChars,
      totalChars: stats.totalChars,
      errors: stats.errors,
      date: new Date().toISOString(),
      wpmHistory: stats.wpmHistory,
    };
    saveTestResult(localResult);

    // If logged in, also save to database
    if (user) {
      try {
        // Save test session
        await supabase.from('test_sessions').insert({
          user_id: user.id,
          test_mode: mode,
          duration_seconds: duration,
          gross_wpm: stats.rawWpm,
          net_wpm: stats.wpm,
          accuracy_percent: stats.accuracy,
          consistency_percent: stats.consistency,
          total_characters: stats.totalChars,
          correct_characters: stats.correctChars,
          error_count: stats.errors,
          wpm_history: stats.wpmHistory,
        });

        // Update leaderboard entry
        const { data: existingEntry } = await supabase
          .from('leaderboards')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingEntry) {
          const testsCompleted = existingEntry.tests_completed + 1;
          const newAvgWpm = ((existingEntry.wpm_avg * existingEntry.tests_completed) + stats.wpm) / testsCompleted;
          const newAvgAccuracy = ((existingEntry.accuracy_avg * existingEntry.tests_completed) + stats.accuracy) / testsCompleted;
          const newAvgConsistency = ((existingEntry.consistency_avg * existingEntry.tests_completed) + stats.consistency) / testsCompleted;

          await supabase
            .from('leaderboards')
            .update({
              wpm_best: Math.max(existingEntry.wpm_best, stats.wpm),
              wpm_avg: newAvgWpm,
              accuracy_avg: newAvgAccuracy,
              consistency_avg: newAvgConsistency,
              tests_completed: testsCompleted,
              total_characters: existingEntry.total_characters + stats.totalChars,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabase.from('leaderboards').insert({
            user_id: user.id,
            wpm_best: stats.wpm,
            wpm_avg: stats.wpm,
            accuracy_avg: stats.accuracy,
            consistency_avg: stats.consistency,
            tests_completed: 1,
            total_characters: stats.totalChars,
          });
        }
      } catch (error) {
        console.error('Failed to save test to database:', error);
      }
    }

    return localResult;
  }, [user]);

  const saveCharacterConfidence = useCallback(async (charMetrics: Record<string, PerCharMetric>) => {
    if (!user) return;

    try {
      for (const [char, metrics] of Object.entries(charMetrics)) {
        const { data: existing } = await supabase
          .from('character_confidence')
          .select('*')
          .eq('user_id', user.id)
          .eq('character', char)
          .maybeSingle();

        if (existing) {
          const shouldUnlock = metrics.wpm >= 35 && metrics.accuracy >= 95;
          
          await supabase
            .from('character_confidence')
            .update({
              confidence_level: metrics.confidence,
              current_wpm: metrics.wpm,
              current_accuracy: metrics.accuracy,
              total_instances: existing.total_instances + metrics.occurrences,
              lessons_practiced: existing.lessons_practiced + 1,
              is_unlocked: existing.is_unlocked || shouldUnlock,
              unlocked_at: shouldUnlock && !existing.is_unlocked ? new Date().toISOString() : existing.unlocked_at,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          const shouldUnlock = metrics.wpm >= 35 && metrics.accuracy >= 95;
          
          await supabase.from('character_confidence').insert({
            user_id: user.id,
            character: char,
            confidence_level: metrics.confidence,
            current_wpm: metrics.wpm,
            current_accuracy: metrics.accuracy,
            total_instances: metrics.occurrences,
            lessons_practiced: 1,
            is_unlocked: shouldUnlock,
            unlocked_at: shouldUnlock ? new Date().toISOString() : null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to save character confidence:', error);
    }
  }, [user]);

  return { saveResult, saveCharacterConfidence };
}
