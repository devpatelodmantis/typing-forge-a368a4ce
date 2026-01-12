import { motion } from 'framer-motion';
import { useTestStore } from '@/stores/test-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CODE_LANGUAGES } from '@/lib/content-library';
import { RefreshCw } from 'lucide-react';

interface ModeSettingsProps {
  codeLanguage: string;
  onCodeLanguageChange: (language: string) => void;
  onRefresh: () => void;
}

export function ModeSettings({ codeLanguage, onCodeLanguageChange, onRefresh }: ModeSettingsProps) {
  const { settings, status } = useTestStore();
  
  if (status === 'running') return null;

  return (
    <motion.div
      className="flex items-center gap-4 mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {settings.mode === 'code' && (
        <Select value={codeLanguage} onValueChange={onCodeLanguageChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {CODE_LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        New text
      </Button>
    </motion.div>
  );
}
