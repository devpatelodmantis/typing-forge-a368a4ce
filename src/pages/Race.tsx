import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { calculateWPM, calculateAccuracy } from '@/lib/typing-engine';
import { Swords, Copy, Users, Trophy, Loader2, Play } from 'lucide-react';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const raceTexts = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "In the middle of difficulty lies opportunity. Every challenge is a chance to grow stronger.",
  "The only way to do great work is to love what you do. Follow your passion relentlessly.",
  "Life is what happens when you are busy making other plans. Embrace the unexpected moments.",
];

const Race = () => {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [joinCode, setJoinCode] = useState('');
  const [raceData, setRaceData] = useState<any>(null);
  const [status, setStatus] = useState<'lobby' | 'waiting' | 'countdown' | 'racing' | 'finished'>('lobby');
  const [countdown, setCountdown] = useState(3);
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHost = raceData?.host_id === user?.id;
  const expectedText = raceData?.expected_text || '';

  // Subscribe to race updates
  useEffect(() => {
    if (!roomCode || !user) return;

    const channel = supabase
      .channel(`race:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'race_sessions',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setRaceData(newData);
          
          // Update opponent progress
          if (user.id === newData.host_id) {
            setOpponentProgress(newData.opponent_progress || 0);
          } else {
            setOpponentProgress(newData.host_progress || 0);
          }
          
          // Handle status changes
          if (newData.status === 'countdown' && status !== 'countdown') {
            setStatus('countdown');
            startCountdown();
          }
          
          if (newData.status === 'completed') {
            setStatus('finished');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, status]);

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('racing');
          setStartTime(Date.now());
          setTimeout(() => inputRef.current?.focus(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const createRace = async () => {
    if (!user) {
      toast({ title: 'Please sign in to create a race', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const code = generateRoomCode();
    const text = raceTexts[Math.floor(Math.random() * raceTexts.length)];

    const { data, error } = await supabase
      .from('race_sessions')
      .insert({
        room_code: code,
        host_id: user.id,
        expected_text: text,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to create race', description: error.message, variant: 'destructive' });
      return;
    }

    setRoomCode(code);
    setRaceData(data);
    setStatus('waiting');
    navigate(`/race/${code}`);
  };

  const joinRace = async () => {
    if (!user) {
      toast({ title: 'Please sign in to join a race', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const code = joinCode.toUpperCase();
    
    const { data: race, error: fetchError } = await supabase
      .from('race_sessions')
      .select('*')
      .eq('room_code', code)
      .eq('status', 'waiting')
      .maybeSingle();

    if (fetchError || !race) {
      toast({ title: 'Race not found', description: 'Invalid room code or race already started', variant: 'destructive' });
      return;
    }

    const { error: updateError } = await supabase
      .from('race_sessions')
      .update({ 
        opponent_id: user.id,
        status: 'countdown',
        started_at: new Date().toISOString(),
      })
      .eq('id', race.id);

    if (updateError) {
      toast({ title: 'Failed to join race', variant: 'destructive' });
      return;
    }

    setRoomCode(code);
    setRaceData({ ...race, opponent_id: user.id });
    setStatus('countdown');
    startCountdown();
    navigate(`/race/${code}`);
  };

  // Load race data from URL
  useEffect(() => {
    if (urlRoomCode && user && !raceData) {
      supabase
        .from('race_sessions')
        .select('*')
        .eq('room_code', urlRoomCode)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setRaceData(data);
            setRoomCode(urlRoomCode);
            if (data.status === 'waiting') {
              setStatus('waiting');
            } else if (data.status === 'active') {
              setStatus('racing');
              setStartTime(Date.now());
            }
          }
        });
    }
  }, [urlRoomCode, user, raceData]);

  const handleTyping = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTypedText(newText);

    if (!startTime) return;

    // Calculate current stats
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const correctChars = [...expectedText].filter((char, i) => char === newText[i]).length;
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    setCurrentWpm(wpm);

    // Update progress in database
    const progress = Math.round((newText.length / expectedText.length) * 100);
    const accuracy = calculateAccuracy(correctChars, newText.length);
    
    const updateData = isHost 
      ? { host_progress: progress, host_wpm: wpm, host_accuracy: accuracy }
      : { opponent_progress: progress, opponent_wpm: wpm, opponent_accuracy: accuracy };

    await supabase
      .from('race_sessions')
      .update(updateData)
      .eq('room_code', roomCode);

    // Check if finished
    if (newText.length >= expectedText.length) {
      const finalWpm = calculateWPM(correctChars, elapsedSeconds);
      const finalAccuracy = calculateAccuracy(correctChars, newText.length);

      await supabase
        .from('race_sessions')
        .update({
          status: 'completed',
          winner_id: user?.id,
          ended_at: new Date().toISOString(),
          ...(isHost 
            ? { host_wpm: finalWpm, host_accuracy: finalAccuracy, host_progress: 100 }
            : { opponent_wpm: finalWpm, opponent_accuracy: finalAccuracy, opponent_progress: 100 }),
        })
        .eq('room_code', roomCode);

      setStatus('finished');
    }
  }, [startTime, expectedText, isHost, roomCode, user?.id]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({ title: 'Room code copied!', description: `Share ${roomCode} with your opponent` });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {status === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-8">
                <Swords className="w-10 h-10 text-primary" />
                <h1 className="text-3xl font-bold">Multiplayer Race</h1>
              </div>
              
              <div className="stat-card p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Create a Race</h2>
                <p className="text-muted-foreground mb-4">
                  Start a new race and invite a friend
                </p>
                <Button onClick={createRace} className="w-full" size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Create Race
                </Button>
              </div>

              <div className="stat-card p-6">
                <h2 className="text-lg font-semibold mb-4">Join a Race</h2>
                <p className="text-muted-foreground mb-4">
                  Enter the room code from your friend
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="text-center font-mono text-lg"
                    maxLength={6}
                  />
                  <Button onClick={joinRace} disabled={joinCode.length !== 6}>
                    Join
                  </Button>
                </div>
              </div>

              {!user && (
                <p className="mt-6 text-muted-foreground">
                  <a href="/auth" className="text-primary hover:underline">Sign in</a> to race against others
                </p>
              )}
            </motion.div>
          )}

          {status === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center"
            >
              <Users className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Waiting for opponent...</h2>
              
              <div className="stat-card p-6 mb-6">
                <p className="text-muted-foreground mb-4">Share this code with your friend:</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                    {roomCode}
                  </span>
                  <Button variant="outline" size="icon" onClick={copyRoomCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            </motion.div>
          )}

          {status === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="text-center"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-9xl font-bold text-primary"
              >
                {countdown}
              </motion.div>
              <p className="text-2xl text-muted-foreground mt-4">Get ready...</p>
            </motion.div>
          )}

          {status === 'racing' && (
            <motion.div
              key="racing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              {/* Progress bars */}
              <div className="mb-8 space-y-4">
                <div className="stat-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-primary">You</span>
                    <span className="font-mono">{currentWpm} WPM</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((typedText.length / expectedText.length) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="stat-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-muted-foreground">Opponent</span>
                    <span className="font-mono text-muted-foreground">
                      {isHost ? raceData?.opponent_wpm || 0 : raceData?.host_wpm || 0} WPM
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-destructive"
                      animate={{ width: `${opponentProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Text display */}
              <div className="stat-card p-6 mb-4 font-mono text-lg leading-relaxed">
                {expectedText.split('').map((char, i) => {
                  let className = 'text-muted-foreground';
                  if (i < typedText.length) {
                    className = typedText[i] === char ? 'text-primary' : 'text-destructive bg-destructive/20';
                  } else if (i === typedText.length) {
                    className = 'bg-primary/30 text-foreground';
                  }
                  return (
                    <span key={i} className={className}>
                      {char}
                    </span>
                  );
                })}
              </div>

              <Input
                ref={inputRef}
                value={typedText}
                onChange={handleTyping}
                className="text-lg font-mono"
                placeholder="Start typing..."
                autoFocus
              />
            </motion.div>
          )}

          {status === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <Trophy className={`w-20 h-20 mx-auto mb-6 ${raceData?.winner_id === user?.id ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              <h2 className="text-3xl font-bold mb-4">
                {raceData?.winner_id === user?.id ? '🎉 You Won!' : 'Race Complete'}
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="stat-card p-4">
                  <p className="text-muted-foreground text-sm">Your WPM</p>
                  <p className="text-3xl font-bold text-primary">
                    {isHost ? raceData?.host_wpm : raceData?.opponent_wpm}
                  </p>
                </div>
                <div className="stat-card p-4">
                  <p className="text-muted-foreground text-sm">Accuracy</p>
                  <p className="text-3xl font-bold">
                    {isHost ? raceData?.host_accuracy : raceData?.opponent_accuracy}%
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate('/race')} className="flex-1">
                  New Race
                </Button>
                <Button onClick={() => navigate('/')} className="flex-1">
                  Back Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Race;
