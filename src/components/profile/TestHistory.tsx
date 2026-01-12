import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Eye,
  Trash2,
  Zap
} from 'lucide-react';
import type { TestSession } from '@/pages/Profile';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestHistoryProps {
  testHistory: TestSession[];
}

type SortField = 'date' | 'wpm' | 'accuracy';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TestHistory({ testHistory: initialHistory }: TestHistoryProps) {
  const [testHistory, setTestHistory] = useState(initialHistory);
  const [selectedTest, setSelectedTest] = useState<TestSession | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Get unique modes
  const modes = useMemo(() => {
    const uniqueModes = new Set(testHistory.map(t => t.test_mode));
    return ['all', ...Array.from(uniqueModes)];
  }, [testHistory]);

  // Filter and sort
  const filteredTests = useMemo(() => {
    let filtered = [...testHistory];
    
    // Apply mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(t => t.test_mode === modeFilter);
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'wpm':
          comparison = a.net_wpm - b.net_wpm;
          break;
        case 'accuracy':
          comparison = a.accuracy_percent - b.accuracy_percent;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [testHistory, modeFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredTests.length / pageSize);
  const paginatedTests = filteredTests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (testId: string) => {
    try {
      const { error } = await supabase
        .from('test_sessions')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      setTestHistory(prev => prev.filter(t => t.id !== testId));
      toast.success('Test deleted successfully');
    } catch (error) {
      toast.error('Failed to delete test');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `${Math.round(diffHours)} hours ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (testHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No test history</h3>
        <p className="text-muted-foreground mb-4">Complete some typing tests to see your history here!</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Start Typing
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by mode" />
          </SelectTrigger>
          <SelectContent>
            {modes.map(mode => (
              <SelectItem key={mode} value={mode}>
                {mode === 'all' ? 'All Modes' : mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Per page" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(size => (
              <SelectItem key={size} value={size.toString()}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground self-center ml-auto">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredTests.length)} of {filteredTests.length}
        </p>
      </div>

      {/* Table */}
      <motion.div 
        className="stat-card overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <table className="w-full">
          <thead>
            <tr className="text-left text-muted-foreground text-sm border-b border-border">
              <th className="pb-4 font-medium">#</th>
              <th 
                className="pb-4 font-medium cursor-pointer hover:text-foreground"
                onClick={() => handleSort('date')}
              >
                <span className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th 
                className="pb-4 font-medium text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort('wpm')}
              >
                <span className="flex items-center justify-end gap-1">
                  WPM
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th 
                className="pb-4 font-medium text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort('accuracy')}
              >
                <span className="flex items-center justify-end gap-1">
                  Accuracy
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </th>
              <th className="pb-4 font-medium hidden md:table-cell">Mode</th>
              <th className="pb-4 font-medium text-right hidden md:table-cell">Duration</th>
              <th className="pb-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTests.map((test, index) => (
              <tr key={test.id} className="border-b border-border/50 last:border-0">
                <td className="py-4 text-muted-foreground">
                  {(currentPage - 1) * pageSize + index + 1}
                </td>
                <td className="py-4 text-sm">{formatDate(test.created_at)}</td>
                <td className="py-4 text-right font-mono font-bold text-primary">
                  {test.net_wpm}
                </td>
                <td className="py-4 text-right">
                  <span className={cn(
                    'font-mono',
                    test.accuracy_percent >= 98 ? 'text-green-500' :
                    test.accuracy_percent >= 95 ? 'text-yellow-500' :
                    'text-red-500'
                  )}>
                    {test.accuracy_percent.toFixed(1)}%
                  </span>
                </td>
                <td className="py-4 hidden md:table-cell capitalize text-sm">
                  {test.test_mode}
                </td>
                <td className="py-4 text-right hidden md:table-cell text-muted-foreground text-sm">
                  {formatDuration(test.duration_seconds)}
                </td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTest(test)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(test.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm px-4">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Test Detail Modal */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Details</DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedTest.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm capitalize">{selectedTest.test_mode} • {formatDuration(selectedTest.duration_seconds)}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-mono text-primary">{selectedTest.net_wpm} <span className="text-sm text-muted-foreground">WPM</span></p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card text-center">
                  <p className="text-xl font-bold font-mono">{selectedTest.gross_wpm}</p>
                  <p className="text-xs text-muted-foreground">Gross WPM</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xl font-bold font-mono">{selectedTest.accuracy_percent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xl font-bold font-mono">{selectedTest.consistency_percent?.toFixed(1) || 0}%</p>
                  <p className="text-xs text-muted-foreground">Consistency</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xl font-bold font-mono">{selectedTest.error_count}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              {/* Character Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Total Characters</p>
                  <p className="text-xl font-bold font-mono">{selectedTest.total_characters}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-muted-foreground">Correct Characters</p>
                  <p className="text-xl font-bold font-mono text-green-500">{selectedTest.correct_characters}</p>
                </div>
              </div>

              {/* WPM Chart */}
              {selectedTest.wpm_history && selectedTest.wpm_history.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-4">WPM Over Time</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedTest.wpm_history.map((wpm, i) => ({ second: i + 1, wpm }))}>
                        <defs>
                          <linearGradient id="wpmGradientDetail" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="second"
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
                          fill="url(#wpmGradientDetail)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
