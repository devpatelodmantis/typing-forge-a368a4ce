import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useToast } from '@/hooks/use-toast';
import { calculateWPM, calculateAccuracy } from '@/lib/typing-engine';
import { BotDifficulty } from '@/lib/bot-engine';
import { useBotRace } from '@/hooks/useBotRace';
import { Loader2 } from 'lucide-react';
import { generateRandomWords } from '@/lib/quotes';

import { RaceLobby } from '@/components/race/RaceLobby';
import { RaceWaiting } from '@/components/race/RaceWaiting';
import { RaceCountdown } from '@/components/race/RaceCountdown';
import { RaceTypingArea } from '@/components/race/RaceTypingArea';
import { RaceResults } from '@/components/race/RaceResults';
import { RaceSettings } from '@/components/race/RaceSettings';

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

const Race = () => {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Race state
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [raceData, setRaceData] = useState<any>(null);
  const [status, setStatus] = useState<RaceStatus>('lobby');
  const [countdown, setCountdown] = useState(3);
  
  // Settings
  const [raceDuration, setRaceDuration] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(30);
  
  // Typing state
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  
  // Opponent state
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentWpm, setOpponentWpm] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty | null>(null);
  
  // Results
  const [myFinalWpm, setMyFinalWpm] = useState(0);
  const [myFinalAccuracy, setMyFinalAccuracy] = useState(0);
  const [opponentFinalWpm, setOpponentFinalWpm] = useState(0);
  const [opponentFinalAccuracy, setOpponentFinalAccuracy] = useState(0);
  
  // Refs
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<any>(null);
  const countdownStartedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isHost = raceData?.host_id === user?.id;
  const expectedText = raceData?.expected_text || '';
  const isBotRace = raceData?.is_bot_race || botDifficulty !== null;

  // Generate race text based on duration
  const generateRaceText = useCallback((duration: number) => {
    // Estimate words needed: ~60 WPM average, multiply by 1.5 for fast typers
    const wordsNeeded = Math.ceil((duration / 60) * 100);
    return generateRandomWords(wordsNeeded, false, false);
  }, []);

  // Bot race hook
  const { reset: resetBot } = useBotRace({
    isActive: status === 'racing' && isBotRace,
    expectedText,
    difficulty: botDifficulty || 'beginner',
    onBotProgress: useCallback((progress: number, wpm: number) => {
      setOpponentProgress(progress);
      setOpponentWpm(wpm);
    }, []),
    onBotFinish: useCallback((wpm: number, accuracy: number) => {
      setOpponentFinalWpm(wpm);
      setOpponentFinalAccuracy(accuracy);
    }, []),
  });

  // Timer countdown for race
  useEffect(() => {
    if (status === 'racing' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time's up - end the race
            finishRace(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // Server-controlled countdown
  const startCountdown = useCallback(() => {
    if (countdownStartedRef.current) return;
    countdownStartedRef.current = true;
    
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('racing');
          setStartTime(Date.now());
          setTimeRemaining(raceDuration);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [raceDuration]);

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
          
          if (user.id === newData.host_id) {
            setOpponentProgress(newData.opponent_progress || 0);
            setOpponentWpm(newData.opponent_wpm || 0);
          } else {
            setOpponentProgress(newData.host_progress || 0);
            setOpponentWpm(newData.host_wpm || 0);
          }
          
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

  const finishRace = useCallback(async (completedByTyping: boolean) => {
    if (status === 'finished') return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
    const correctChars = [...expectedText].filter((char, i) => char === typedText[i]).length;
    const finalWpm = calculateWPM(correctChars, elapsedSeconds);
    const finalAccuracy = calculateAccuracy(correctChars, typedText.length);
    
    setMyFinalWpm(finalWpm);
    setMyFinalAccuracy(finalAccuracy);
    
    // For bot races, capture bot's final state
    if (isBotRace) {
      setOpponentFinalWpm(opponentWpm);
      setOpponentFinalAccuracy(95 + Math.random() * 4); // Bot accuracy estimate
    }
    
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
  }, [status, startTime, expectedText, typedText, isBotRace, roomCode, isHost, opponentWpm]);

  const createRace = async () => {
    if (!user) {
      toast({ title: 'Please sign in to create a race', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    const code = generateRoomCode();
    const text = generateRaceText(raceDuration);

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

    const text = generateRaceText(raceDuration);
    
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
    setTimeRemaining(raceDuration);
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
    const accuracy = calculateAccuracy(correctChars, newText.length);
    
    setCurrentWpm(wpm);
    setCurrentAccuracy(accuracy);

    // Update progress in database (multiplayer only)
    if (!isBotRace && roomCode) {
      const progress = Math.round((newText.length / expectedText.length) * 100);
      
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

    // Check if finished typing all text
    if (newText.length >= expectedText.length) {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
        updateThrottleRef.current = null;
      }
      finishRace(true);
    }
  }, [startTime, expectedText, isHost, roomCode, isBotRace, finishRace]);

  const handleRestart = useCallback(() => {
    resetBot();
    setTypedText('');
    setCurrentWpm(0);
    setCurrentAccuracy(100);
    setOpponentProgress(0);
    setOpponentWpm(0);
    setMyFinalWpm(0);
    setMyFinalAccuracy(0);
    setOpponentFinalWpm(0);
    setOpponentFinalAccuracy(0);
    setTimeRemaining(raceDuration);
    countdownStartedRef.current = false;
    
    if (botDifficulty) {
      // Restart bot race with same difficulty
      const text = generateRaceText(raceDuration);
      setRaceData({
        expected_text: text,
        host_id: user?.id,
        is_bot_race: true,
        bot_difficulty: botDifficulty,
      });
      setStatus('countdown');
      startCountdown();
    } else {
      // Return to lobby for multiplayer
      setStatus('lobby');
      setRaceData(null);
      setRoomCode('');
      setBotDifficulty(null);
    }
  }, [botDifficulty, raceDuration, generateRaceText, startCountdown, resetBot, user]);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
        {/* Title */}
        {status === 'lobby' && (
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Race Mode</h1>
            <p className="text-muted-foreground">
              Challenge opponents in real-time typing races
            </p>
          </motion.div>
        )}

        {/* Settings - show in lobby */}
        {status === 'lobby' && (
          <RaceSettings
            duration={raceDuration}
            onDurationChange={setRaceDuration}
            isBot={false}
            disabled={false}
          />
        )}

        {/* Racing settings indicator */}
        {(status === 'racing' || status === 'countdown') && (
          <RaceSettings
            duration={raceDuration}
            onDurationChange={() => {}}
            isBot={isBotRace}
            botDifficulty={botDifficulty || undefined}
            disabled={true}
          />
        )}

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
            <RaceTypingArea
              expectedText={expectedText}
              typedText={typedText}
              currentWpm={currentWpm}
              currentAccuracy={currentAccuracy}
              opponentWpm={opponentWpm}
              opponentProgress={opponentProgress}
              isBot={isBotRace}
              botDifficulty={botDifficulty || undefined}
              timeRemaining={timeRemaining}
              isRacing={true}
              onTyping={handleTyping}
              onRestart={handleRestart}
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
              onPlayAgain={handleRestart}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Race;
