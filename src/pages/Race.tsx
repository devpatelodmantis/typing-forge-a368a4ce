import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { calculateWPM, calculateAccuracy } from '@/lib/typing-engine';
import { BotDifficulty } from '@/lib/bot-engine';
import { useBotRace } from '@/hooks/useBotRace';
import { Loader2 } from 'lucide-react';

import { RaceLobby } from '@/components/race/RaceLobby';
import { RaceWaiting } from '@/components/race/RaceWaiting';
import { RaceCountdown } from '@/components/race/RaceCountdown';
import { RaceTrack } from '@/components/race/RaceTrack';
import { RaceResults } from '@/components/race/RaceResults';

type RaceStatus = 'lobby' | 'waiting' | 'countdown' | 'racing' | 'finished';

function generateRoomCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  
  return code;
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
  const [raceData, setRaceData] = useState<any>(null);
  const [status, setStatus] = useState<RaceStatus>('lobby');
  const [countdown, setCountdown] = useState(3);
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentWpm, setOpponentWpm] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  const [myFinalWpm, setMyFinalWpm] = useState(0);
  const [myFinalAccuracy, setMyFinalAccuracy] = useState(0);
  const [opponentFinalWpm, setOpponentFinalWpm] = useState(0);
  const [opponentFinalAccuracy, setOpponentFinalAccuracy] = useState(0);
  
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<any>(null);
  const countdownStartedRef = useRef(false);

  const isHost = raceData?.host_id === user?.id;
  const expectedText = raceData?.expected_text || '';
  const isBotRace = raceData?.is_bot_race || botDifficulty !== null;

  // Bot race hook
  const { reset: resetBot } = useBotRace({
    isActive: status === 'racing' && isBotRace,
    expectedText,
    difficulty: botDifficulty || 'beginner',
    onBotProgress: useCallback((progress: number, wpm: number, accuracy: number) => {
      setOpponentProgress(progress);
      setOpponentWpm(wpm);
    }, []),
    onBotFinish: useCallback((wpm: number, accuracy: number) => {
      setOpponentFinalWpm(wpm);
      setOpponentFinalAccuracy(accuracy);
      // Bot finished - check if player already finished
      if (status === 'finished') return;
      // If player hasn't finished, bot wins
      if (typedText.length < expectedText.length) {
        finishRace(false, wpm, accuracy);
      }
    }, [status, typedText.length, expectedText.length]),
  });

  // Server-controlled countdown - only triggered once
  const startCountdown = useCallback(() => {
    if (countdownStartedRef.current) return; // Prevent duplicate countdowns
    countdownStartedRef.current = true;
    
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('racing');
          setStartTime(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Subscribe to race updates (multiplayer only)
  useEffect(() => {
    if (!roomCode || !user || isBotRace) return;

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
            setOpponentWpm(newData.opponent_wpm || 0);
          } else {
            setOpponentProgress(newData.host_progress || 0);
            setOpponentWpm(newData.host_wpm || 0);
          }
          
          // Handle status changes - server authoritative
          if (newData.status === 'countdown' && status !== 'countdown' && status !== 'racing') {
            setStatus('countdown');
            startCountdown();
          }
          
          if (newData.status === 'completed' && status !== 'finished') {
            const myWpm = user.id === newData.host_id ? newData.host_wpm : newData.opponent_wpm;
            const myAcc = user.id === newData.host_id ? newData.host_accuracy : newData.opponent_accuracy;
            const oppWpm = user.id === newData.host_id ? newData.opponent_wpm : newData.host_wpm;
            const oppAcc = user.id === newData.host_id ? newData.opponent_accuracy : newData.host_accuracy;
            
            setMyFinalWpm(myWpm || 0);
            setMyFinalAccuracy(myAcc || 0);
            setOpponentFinalWpm(oppWpm || 0);
            setOpponentFinalAccuracy(oppAcc || 0);
            setStatus('finished');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, status, isBotRace, startCountdown]);

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

  const finishRace = useCallback(async (playerWon: boolean, botWpm?: number, botAcc?: number) => {
    if (status === 'finished') return;
    
    const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
    const correctChars = [...expectedText].filter((char, i) => char === typedText[i]).length;
    const finalWpm = calculateWPM(correctChars, elapsedSeconds);
    const finalAccuracy = calculateAccuracy(correctChars, typedText.length);
    
    setMyFinalWpm(finalWpm);
    setMyFinalAccuracy(finalAccuracy);
    setOpponentFinalWpm(botWpm || opponentFinalWpm);
    setOpponentFinalAccuracy(botAcc || opponentFinalAccuracy);
    setStatus('finished');

    // Update database for non-bot races
    if (!isBotRace && roomCode) {
      await supabase
        .from('race_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          ...(isHost 
            ? { host_wpm: finalWpm, host_accuracy: finalAccuracy, host_progress: 100 }
            : { opponent_wpm: finalWpm, opponent_accuracy: finalAccuracy, opponent_progress: 100 }),
        })
        .eq('room_code', roomCode);
    }
  }, [status, startTime, expectedText, typedText, isBotRace, roomCode, isHost, opponentFinalWpm, opponentFinalAccuracy]);

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
        is_bot_race: false,
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
    countdownStartedRef.current = false;
    navigate(`/race/${code}`);
  };

  const createBotRace = async (difficulty: BotDifficulty) => {
    if (!user) {
      toast({ title: 'Please sign in to race', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const text = raceTexts[Math.floor(Math.random() * raceTexts.length)];
    
    // For bot races, we don't need database - just local state
    setBotDifficulty(difficulty);
    setRaceData({
      expected_text: text,
      host_id: user.id,
      is_bot_race: true,
      bot_difficulty: difficulty,
    });
    setTypedText('');
    setOpponentProgress(0);
    setOpponentWpm(0);
    countdownStartedRef.current = false;
    setStatus('countdown');
    startCountdown();
  };

  const joinRace = async (joinCode: string) => {
    if (!user) {
      toast({ title: 'Please sign in to join a race', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const code = joinCode.toUpperCase().trim();
    
    if (!/^[0-9A-Z]{6}$/.test(code)) {
      toast({ 
        title: 'Invalid room code', 
        description: 'Room code must be 6 alphanumeric characters',
        variant: 'destructive' 
      });
      return;
    }
    
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
        countdown_started_at: new Date().toISOString(),
      })
      .eq('id', race.id);

    if (updateError) {
      toast({ title: 'Failed to join race', variant: 'destructive' });
      return;
    }

    setRoomCode(code);
    setRaceData({ ...race, opponent_id: user.id });
    countdownStartedRef.current = false;
    setStatus('countdown');
    startCountdown();
    navigate(`/race/${code}`);
  };

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTypedText(newText);

    if (!startTime) return;

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const correctChars = [...expectedText].filter((char, i) => char === newText[i]).length;
    const wpm = calculateWPM(correctChars, elapsedSeconds);
    setCurrentWpm(wpm);

    // Update progress in database (multiplayer only)
    if (!isBotRace && roomCode) {
      const progress = Math.round((newText.length / expectedText.length) * 100);
      const accuracy = calculateAccuracy(correctChars, newText.length);
      
      const updateData = isHost 
        ? { host_progress: progress, host_wpm: wpm, host_accuracy: accuracy }
        : { opponent_progress: progress, opponent_wpm: wpm, opponent_accuracy: accuracy };

      pendingUpdateRef.current = updateData;

      if (!updateThrottleRef.current) {
        updateThrottleRef.current = setTimeout(async () => {
          if (pendingUpdateRef.current) {
            await supabase
              .from('race_sessions')
              .update(pendingUpdateRef.current)
              .eq('room_code', roomCode);
            pendingUpdateRef.current = null;
          }
          updateThrottleRef.current = null;
        }, 200);
      }
    }

    // Check if finished
    if (newText.length >= expectedText.length) {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
        updateThrottleRef.current = null;
      }
      
      const finalWpm = calculateWPM(correctChars, elapsedSeconds);
      const finalAccuracy = calculateAccuracy(correctChars, newText.length);
      
      setMyFinalWpm(finalWpm);
      setMyFinalAccuracy(finalAccuracy);

      if (isBotRace) {
        // Player finished - check if they beat the bot
        const playerWon = opponentProgress < 100;
        finishRace(playerWon, opponentWpm, opponentFinalAccuracy || 95);
      } else {
        finishRace(true);
      }
    }
  }, [startTime, expectedText, isHost, roomCode, isBotRace, opponentProgress, opponentWpm, opponentFinalAccuracy, finishRace]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({ title: 'Room code copied!', description: `Share ${roomCode} with your opponent` });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isWinner = isBotRace 
    ? myFinalWpm > opponentFinalWpm || (myFinalWpm === opponentFinalWpm && myFinalAccuracy >= opponentFinalAccuracy)
    : raceData?.winner_id === user?.id;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {status === 'lobby' && (
            <RaceLobby
              user={user}
              onCreateRace={createRace}
              onJoinRace={joinRace}
              onCreateBotRace={createBotRace}
            />
          )}

          {status === 'waiting' && (
            <RaceWaiting
              roomCode={roomCode}
              onCopyCode={copyRoomCode}
            />
          )}

          {status === 'countdown' && (
            <RaceCountdown countdown={countdown} />
          )}

          {status === 'racing' && (
            <RaceTrack
              expectedText={expectedText}
              typedText={typedText}
              currentWpm={currentWpm}
              opponentWpm={opponentWpm}
              opponentProgress={opponentProgress}
              isBot={isBotRace}
              botDifficulty={botDifficulty || undefined}
              onTyping={handleTyping}
            />
          )}

          {status === 'finished' && (
            <RaceResults
              isWinner={isWinner}
              myWpm={myFinalWpm}
              myAccuracy={myFinalAccuracy}
              opponentWpm={opponentFinalWpm}
              opponentAccuracy={opponentFinalAccuracy}
              isBot={isBotRace}
              botDifficulty={botDifficulty || undefined}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Race;
