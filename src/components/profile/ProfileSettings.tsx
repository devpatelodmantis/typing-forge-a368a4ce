import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Target, Save, Loader2 } from 'lucide-react';
import type { ProfileData } from '@/pages/Profile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  profile: ProfileData;
  onUpdate: (profile: ProfileData) => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: profile.username,
    target_wpm: profile.target_wpm,
    theme: profile.theme,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          target_wpm: formData.target_wpm,
          theme: formData.theme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate({
        ...profile,
        ...formData,
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Profile Settings */}
      <motion.div 
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Profile Settings</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter your username"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              This is your display name on the leaderboard
            </p>
          </div>
        </div>
      </motion.div>

      {/* Typing Preferences */}
      <motion.div 
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Typing Preferences</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="target_wpm">Target WPM</Label>
            <Select
              value={formData.target_wpm.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_wpm: Number(value) }))}
            >
              <SelectTrigger id="target_wpm">
                <SelectValue placeholder="Select target WPM" />
              </SelectTrigger>
              <SelectContent>
                {[25, 35, 50, 60, 75, 100, 125, 150].map(wpm => (
                  <SelectItem key={wpm} value={wpm.toString()}>
                    {wpm} WPM
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Your target speed for unlocking characters in Learn mode
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={formData.theme}
              onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))}
            >
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="auto">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
