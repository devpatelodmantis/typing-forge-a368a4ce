-- ============================================
-- PROFILES TABLE (User data extension)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  target_wpm INT DEFAULT 35,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TEST SESSIONS TABLE
-- ============================================
CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  test_mode VARCHAR(50) NOT NULL,
  duration_seconds INT NOT NULL,
  gross_wpm DECIMAL(7,2),
  net_wpm DECIMAL(7,2),
  accuracy_percent DECIMAL(5,2),
  consistency_percent DECIMAL(5,2),
  total_characters INT,
  correct_characters INT,
  error_count INT,
  wpm_history JSONB DEFAULT '[]',
  per_char_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test sessions" 
ON public.test_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test sessions" 
ON public.test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_test_sessions_user_date ON public.test_sessions(user_id, created_at DESC);
CREATE INDEX idx_test_sessions_mode ON public.test_sessions(test_mode);

-- ============================================
-- CHARACTER CONFIDENCE TABLE (Keybr)
-- ============================================
CREATE TABLE public.character_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character CHAR(1) NOT NULL,
  confidence_level DECIMAL(3,2) DEFAULT 0,
  current_wpm DECIMAL(7,2) DEFAULT 0,
  current_accuracy DECIMAL(5,2) DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  lessons_practiced INT DEFAULT 0,
  total_instances INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, character)
);

ALTER TABLE public.character_confidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character confidence" 
ON public.character_confidence FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character confidence" 
ON public.character_confidence FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character confidence" 
ON public.character_confidence FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_char_confidence_user ON public.character_confidence(user_id, is_unlocked, confidence_level DESC);

-- ============================================
-- LEADERBOARDS TABLE (Cached rankings)
-- ============================================
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  wpm_best DECIMAL(7,2) DEFAULT 0,
  wpm_avg DECIMAL(7,2) DEFAULT 0,
  accuracy_avg DECIMAL(5,2) DEFAULT 0,
  consistency_avg DECIMAL(5,2) DEFAULT 0,
  tests_completed INT DEFAULT 0,
  total_characters INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboards are viewable by everyone" 
ON public.leaderboards FOR SELECT USING (true);

CREATE POLICY "Users can upsert their own leaderboard entry" 
ON public.leaderboards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leaderboard entry" 
ON public.leaderboards FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_leaderboard_wpm ON public.leaderboards(wpm_best DESC);
CREATE INDEX idx_leaderboard_accuracy ON public.leaderboards(accuracy_avg DESC);
CREATE INDEX idx_leaderboard_tests ON public.leaderboards(tests_completed DESC);

-- ============================================
-- RACE SESSIONS TABLE (Multiplayer)
-- ============================================
CREATE TABLE public.race_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'countdown', 'active', 'completed', 'cancelled')),
  host_wpm DECIMAL(7,2),
  host_accuracy DECIMAL(5,2),
  host_progress INT DEFAULT 0,
  opponent_wpm DECIMAL(7,2),
  opponent_accuracy DECIMAL(5,2),
  opponent_progress INT DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.race_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view races (for joining)
CREATE POLICY "Anyone can view waiting races" 
ON public.race_sessions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create races" 
ON public.race_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Race participants can update" 
ON public.race_sessions FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = opponent_id);

CREATE INDEX idx_race_room_code ON public.race_sessions(room_code);
CREATE INDEX idx_race_status ON public.race_sessions(status);

-- Enable realtime for race sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_sessions;

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general',
  difficulty VARCHAR(20) DEFAULT 'medium',
  character_count INT,
  word_count INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quotes are viewable by everyone" 
ON public.quotes FOR SELECT USING (true);

-- Insert some initial quotes
INSERT INTO public.quotes (content, author, category, difficulty, character_count, word_count) VALUES
('The only way to do great work is to love what you do.', 'Steve Jobs', 'motivation', 'easy', 52, 12),
('In the middle of difficulty lies opportunity.', 'Albert Einstein', 'motivation', 'easy', 45, 7),
('Life is what happens when you are busy making other plans.', 'John Lennon', 'life', 'easy', 58, 11),
('The future belongs to those who believe in the beauty of their dreams.', 'Eleanor Roosevelt', 'motivation', 'medium', 69, 13),
('It is during our darkest moments that we must focus to see the light.', 'Aristotle', 'wisdom', 'medium', 68, 14),
('The only impossible journey is the one you never begin.', 'Tony Robbins', 'motivation', 'easy', 54, 10),
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill', 'success', 'medium', 85, 15),
('Believe you can and you are halfway there.', 'Theodore Roosevelt', 'motivation', 'easy', 41, 8),
('The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb', 'wisdom', 'medium', 74, 16),
('Your time is limited, do not waste it living someone elses life.', 'Steve Jobs', 'life', 'medium', 62, 12);

-- ============================================
-- CODE SNIPPETS TABLE
-- ============================================
CREATE TABLE public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  difficulty VARCHAR(20) DEFAULT 'medium',
  character_count INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Code snippets are viewable by everyone" 
ON public.code_snippets FOR SELECT USING (true);

-- Insert some initial code snippets
INSERT INTO public.code_snippets (content, language, title, difficulty, character_count) VALUES
('const greeting = "Hello, World!";', 'javascript', 'Hello World Variable', 'easy', 34),
('function add(a, b) { return a + b; }', 'javascript', 'Add Function', 'easy', 36),
('const arr = [1, 2, 3].map(x => x * 2);', 'javascript', 'Array Map', 'easy', 38),
('async function fetchData(url) { const res = await fetch(url); return res.json(); }', 'javascript', 'Async Fetch', 'medium', 82),
('const [count, setCount] = useState(0);', 'javascript', 'React useState', 'easy', 38),
('def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)', 'python', 'Fibonacci', 'medium', 73),
('SELECT * FROM users WHERE age > 18 ORDER BY name;', 'sql', 'Select Query', 'easy', 49),
('fn main() { println!("Hello, Rust!"); }', 'rust', 'Hello Rust', 'easy', 40),
('public static void main(String[] args) { System.out.println("Hello"); }', 'java', 'Hello Java', 'medium', 70),
('interface User { id: number; name: string; email?: string; }', 'typescript', 'Interface', 'easy', 60);