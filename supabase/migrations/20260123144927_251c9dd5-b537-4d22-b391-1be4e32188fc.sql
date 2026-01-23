-- Add version column for optimistic concurrency control
ALTER TABLE public.race_sessions 
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL;

-- Add bot-related fields
ALTER TABLE public.race_sessions 
ADD COLUMN IF NOT EXISTS is_bot_race boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bot_difficulty character varying DEFAULT NULL,
ADD COLUMN IF NOT EXISTS countdown_started_at timestamp with time zone DEFAULT NULL;

-- Add check constraint for bot difficulty
ALTER TABLE public.race_sessions 
ADD CONSTRAINT valid_bot_difficulty 
CHECK (bot_difficulty IS NULL OR bot_difficulty IN ('beginner', 'intermediate', 'pro'));

-- Create index for faster race lookups
CREATE INDEX IF NOT EXISTS idx_race_sessions_room_code_status 
ON public.race_sessions(room_code, status);

-- Create index for version-based updates
CREATE INDEX IF NOT EXISTS idx_race_sessions_version 
ON public.race_sessions(id, version);