import { motion } from 'framer-motion';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, Share2, TrendingUp, Target, Zap, CheckCircle, XCircle, AlertTriangle, Award, BarChart3, Clock, Keyboard } from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { type ProfessionalAccuracyReport } from '@/lib/professional-accuracy';
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface ProfessionalResultsScreenProps {
  report: ProfessionalAccuracyReport;
  wpmHistory: number[];
  onRestart: () => void;
  onNewTest: () => void;
}

export function ProfessionalResultsScreen({ 
  report, 
  wpmHistory, 
  onRestart, 
  onNewTest 
}: ProfessionalResultsScreenProps) {
  const { settings } = useTestStore();
  
  // Prepare WPM chart data
  const wpmChartData = wpmHistory.map((wpm, index) => ({
    time: index + 1,
    wpm,
  }));
  
  // Prepare distribution chart data
  const distributionData = Object.entries(report.distribution).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    accuracy: data.accuracy,
    correct: data.correct,
    incorrect: data.incorrect,
    total: data.correct + data.incorrect,
  })).filter(d => d.total > 0);
  
  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'PROFESSIONAL': return 'text-yellow-500';
      case 'ADVANCED': return 'text-purple-500';
      case 'INTERMEDIATE': return 'text-blue-500';
      case 'BEGINNER': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };
  
  const getSkillLevelBadge = (level: string) => {
    switch (level) {
      case 'PROFESSIONAL': return '🏆';
      case 'ADVANCED': return '⭐';
      case 'INTERMEDIATE': return '📈';
      case 'BEGINNER': return '🌱';
      default: return '📚';
    }
  };
  
  const getRatingColor = (rating: number) => {
    if (rating >= 85) return 'text-success';
    if (rating >= 70) return 'text-primary';
    if (rating >= 50) return 'text-warning';
    return 'text-destructive';
  };
  
  return (
    <motion.div
      className="w-full max-w-5xl mx-auto space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header with Skill Assessment */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-4xl">{getSkillLevelBadge(report.assessment.skillLevel)}</span>
          <h2 className={cn("text-3xl font-bold", getSkillLevelColor(report.assessment.skillLevel))}>
            {report.assessment.skillLevel}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-muted-foreground">Overall Rating:</span>
          <span className={cn("text-2xl font-bold", getRatingColor(report.assessment.overallRating))}>
            {report.assessment.overallRating}/100
          </span>
        </div>
      </motion.div>
      
      {/* Main Stats Grid */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <StatCard 
          label="WPM" 
          value={report.overview.wpm} 
          variant={report.overview.wpm >= 80 ? 'success' : report.overview.wpm >= 50 ? 'primary' : 'default'}
          size="lg"
        />
        <StatCard 
          label="Accuracy" 
          value={report.overview.accuracy} 
          suffix="%" 
          variant={report.overview.accuracy >= 98 ? 'success' : report.overview.accuracy >= 95 ? 'primary' : report.overview.accuracy >= 90 ? 'warning' : 'error'}
          size="lg"
        />
        <StatCard 
          label="Consistency" 
          value={report.overview.consistency} 
          suffix="%" 
          variant={report.overview.consistency >= 80 ? 'success' : report.overview.consistency >= 60 ? 'primary' : 'warning'}
        />
        <StatCard 
          label="Net WPM" 
          value={report.overview.netWpm} 
          variant="default"
        />
      </motion.div>
      
      {/* WPM Over Time Chart */}
      {wpmChartData.length > 1 && (
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Speed Over Time</h3>
            <div className="flex-1" />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Peak: <span className="text-success font-bold">{report.consistency.peakWpm}</span></span>
              <span>Low: <span className="text-warning font-bold">{report.consistency.lowestWpm}</span></span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wpmChartData}>
                <defs>
                  <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
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
                  labelFormatter={(label) => `Second ${label}`}
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
      
      {/* Accuracy Breakdown */}
      <motion.div
        className="grid md:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* Accuracy Details */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Accuracy Breakdown</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                Correct Characters
              </span>
              <span className="font-mono font-bold text-success">{report.accuracy.correctChars}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="w-4 h-4 text-destructive" />
                Incorrect Characters
              </span>
              <span className="font-mono font-bold text-destructive">{report.accuracy.incorrectChars}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Missed Characters
              </span>
              <span className="font-mono font-bold text-warning">{report.accuracy.missedChars}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                Extra Characters
              </span>
              <span className="font-mono font-bold text-muted-foreground">{report.accuracy.extraChars}</span>
            </div>
            
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Error Rate</span>
                <span className={cn(
                  "font-mono font-bold",
                  report.errors.errorRate < 3 ? "text-success" : 
                  report.errors.errorRate < 5 ? "text-primary" : 
                  report.errors.errorRate < 10 ? "text-warning" : "text-destructive"
                )}>
                  {report.errors.errorRate}%
                </span>
              </div>
              {report.accuracy.backspaceUsed && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground text-sm">Corrections Made</span>
                  <span className="font-mono text-warning text-sm">
                    {report.accuracy.backspaceCount} ({report.typing.backspacePercentage}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Typing Metrics */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Typing Metrics</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Keystrokes</span>
              <span className="font-mono font-bold">{report.typing.totalKeystrokes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Characters Typed</span>
              <span className="font-mono font-bold">{report.typing.totalCharsTyped}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Chars/Second</span>
              <span className="font-mono font-bold">{report.typing.charsPerSecond}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Raw WPM</span>
              <span className="font-mono font-bold">{report.typing.rawWpm}</span>
            </div>
            
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Keystroke Interval</span>
                <span className="font-mono">{report.consistency.keystrokeIntervals.average}ms</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground text-sm">Min / Max</span>
                <span className="font-mono text-sm">
                  {report.consistency.keystrokeIntervals.min}ms / {report.consistency.keystrokeIntervals.max}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Character Type Distribution */}
      {distributionData.length > 0 && (
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Character Type Distribution</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {distributionData.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className={cn(
                    "text-sm font-bold",
                    item.accuracy >= 98 ? "text-success" : 
                    item.accuracy >= 95 ? "text-primary" : 
                    item.accuracy >= 90 ? "text-warning" : "text-destructive"
                  )}>
                    {item.accuracy}%
                  </span>
                </div>
                <Progress 
                  value={item.accuracy} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.correct} correct</span>
                  <span>{item.incorrect} errors</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Consistency Analysis */}
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Consistency Analysis</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 text-center p-4 bg-muted/30 rounded-lg">
            <div className={cn(
              "text-5xl font-bold mb-1",
              report.consistency.score >= 80 ? "text-success" : 
              report.consistency.score >= 60 ? "text-primary" : "text-warning"
            )}>
              {report.consistency.score}%
            </div>
            <div className="text-sm text-muted-foreground">Consistency Score</div>
          </div>
          
          <div className="flex-1 space-y-3">
            <p className="text-muted-foreground">{report.consistency.consistencyLevel}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Average Interval</div>
                <div className="font-mono font-bold">{report.consistency.keystrokeIntervals.average}ms</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Median Interval</div>
                <div className="font-mono font-bold">{report.consistency.keystrokeIntervals.median}ms</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Std. Deviation</div>
                <div className="font-mono font-bold">{report.consistency.keystrokeIntervals.stdDev}ms</div>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="font-mono font-bold">{report.overview.duration}s</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Skill Assessment */}
      <motion.div
        className="grid md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Rating Card */}
        <div className="stat-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Overall Rating</h3>
          </div>
          <div className="text-center py-4">
            <div className={cn("text-6xl font-bold", getRatingColor(report.assessment.overallRating))}>
              {report.assessment.overallRating}
            </div>
            <div className="text-muted-foreground mt-1">out of 100</div>
            <div className="mt-4">
              <span className={cn("px-3 py-1 rounded-full text-sm font-medium", 
                report.assessment.skillLevel === 'PROFESSIONAL' ? "bg-yellow-500/20 text-yellow-500" :
                report.assessment.skillLevel === 'ADVANCED' ? "bg-purple-500/20 text-purple-500" :
                report.assessment.skillLevel === 'INTERMEDIATE' ? "bg-blue-500/20 text-blue-500" :
                report.assessment.skillLevel === 'BEGINNER' ? "bg-green-500/20 text-green-500" :
                "bg-muted text-muted-foreground"
              )}>
                {report.assessment.skillLevel}
              </span>
            </div>
          </div>
        </div>
        
        {/* Strengths */}
        <div className="stat-card border-l-4 border-l-success">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-success" />
            <h3 className="text-lg font-semibold">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {report.assessment.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-success mt-0.5">✓</span>
                <span className="text-muted-foreground">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Improvements */}
        <div className="stat-card border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Focus Areas</h3>
          </div>
          <ul className="space-y-2">
            {report.assessment.improvements.map((improvement, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">→</span>
                <span className="text-muted-foreground">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
      
      {/* Error Details (if any) */}
      {report.errors.typos.length > 0 && (
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">Error Analysis</h3>
            <span className="text-sm text-muted-foreground">({report.errors.totalErrors} total)</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {report.errors.typos.slice(0, 10).map((typo, i) => (
              <div 
                key={i}
                className="px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm"
              >
                <span className="text-destructive font-mono">{typo.typed}</span>
                <span className="text-muted-foreground mx-1">→</span>
                <span className="text-success font-mono">{typo.expected}</span>
              </div>
            ))}
            {report.errors.typos.length > 10 && (
              <div className="px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground">
                +{report.errors.typos.length - 10} more
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Test Info Footer */}
      <motion.div
        className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{report.overview.duration}s</span>
        </div>
        <span>•</span>
        <span className="capitalize">{settings.mode} mode</span>
        <span>•</span>
        <span>{report.accuracy.totalTargetChars} characters</span>
      </motion.div>
      
      {/* Action Buttons */}
      <motion.div
        className="flex flex-wrap justify-center gap-4 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Button
          onClick={onRestart}
          variant="default"
          size="lg"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
          onClick={onNewTest}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          New Test
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </motion.div>
    </motion.div>
  );
}
