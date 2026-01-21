import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TestSettings } from '@/components/typing/TestSettings';
import { TypingArea } from '@/components/typing/TypingArea';
import { ProfessionalResultsScreen } from '@/components/typing/ProfessionalResultsScreen';
import { KeybrLessonMode } from '@/components/keybr/KeybrLessonMode';
import { useTestStore } from '@/stores/test-store';
import { type TypingStats } from '@/lib/typing-engine';
import { 
  generateProfessionalAccuracyReport, 
  type ProfessionalAccuracyReport,
  type Keystroke 
} from '@/lib/professional-accuracy';
import { generateRandomWords, getRandomQuote } from '@/lib/quotes';
import { useTestResults } from '@/hooks/useTestResults';

const Index = () => {
  const { status, settings, resetTest, setTargetText } = useTestStore();
  const [results, setResults] = useState<{
    report: ProfessionalAccuracyReport;
    wpmHistory: number[];
  } | null>(null);
  const { saveResult } = useTestResults();
  
  const handleTestComplete = useCallback(async (stats: TypingStats & { 
    wpmHistory: number[]; 
    backspaceCount: number;
    keystrokeLog: Keystroke[];
    targetText: string;
    typedText: string;
  }) => {
    // Generate professional accuracy report
    const report = generateProfessionalAccuracyReport(
      stats.targetText,
      stats.typedText,
      stats.keystrokeLog,
      stats.elapsedTime,
      stats.backspaceCount,
      stats.wpmHistory
    );
    
    setResults({ report, wpmHistory: stats.wpmHistory });
    
    // Save to both localStorage and database
    await saveResult(stats, settings.mode, settings.duration);
  }, [saveResult, settings.mode, settings.duration]);
  
  const handleRestart = useCallback(() => {
    setResults(null);
    // Generate new text based on mode
    let text = '';
    switch (settings.mode) {
      case 'quote':
        text = getRandomQuote().text;
        break;
      case 'words':
        text = generateRandomWords(settings.wordCount, settings.punctuation, settings.numbers);
        break;
      default:
        text = generateRandomWords(200, settings.punctuation, settings.numbers);
        break;
    }
    setTargetText(text);
    resetTest();
  }, [settings, resetTest, setTargetText]);
  
  const handleNewTest = useCallback(() => {
    setResults(null);
    resetTest();
  }, [resetTest]);
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col items-center">
          {/* Title - hidden when running */}
          {status !== 'running' && (
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {settings.mode === 'keybr' ? 'Adaptive Learning' : 'Test your typing speed'}
              </h1>
              <p className="text-muted-foreground">
                {settings.mode === 'keybr' 
                  ? 'Master each letter with intelligent practice - unlock new letters as you improve'
                  : 'Choose your mode and start typing to begin the test'}
              </p>
            </div>
          )}
          
          {/* Settings */}
          <TestSettings />
          
          {/* Main Content */}
          <AnimatePresence mode="wait">
            {settings.mode === 'keybr' ? (
              <KeybrLessonMode key="keybr" />
            ) : status === 'finished' && results ? (
              <ProfessionalResultsScreen 
                key="results"
                report={results.report}
                wpmHistory={results.wpmHistory}
                onRestart={handleRestart}
                onNewTest={handleNewTest}
              />
            ) : (
              <TypingArea 
                key="typing"
                onTestComplete={handleTestComplete} 
              />
            )}
          </AnimatePresence>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
