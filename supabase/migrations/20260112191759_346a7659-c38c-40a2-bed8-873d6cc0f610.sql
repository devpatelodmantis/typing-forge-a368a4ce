-- Drop the existing overly permissive UPDATE policy
DROP POLICY IF EXISTS "Race participants can update" ON race_sessions;

-- Policy 1: Allow anyone to join a waiting race as opponent (when opponent_id is NULL)
CREATE POLICY "Can join as opponent when empty" 
ON race_sessions FOR UPDATE 
USING (
  opponent_id IS NULL 
  AND status = 'waiting'
)
WITH CHECK (
  -- Can only set opponent_id to themselves, and only change status to 'countdown'
  opponent_id = auth.uid()
  AND status = 'countdown'
);

-- Policy 2: Host can update status during waiting/countdown (e.g., start race)
CREATE POLICY "Host can manage race status" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = host_id
  AND status IN ('waiting', 'countdown', 'active')
)
WITH CHECK (
  -- Host cannot change opponent_id once set
  (opponent_id IS NULL OR opponent_id = opponent_id)
);

-- Policy 3: Host can update their own progress during active race
CREATE POLICY "Host can update own progress" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = host_id
  AND status = 'active'
);

-- Policy 4: Opponent can update their own progress during active race  
CREATE POLICY "Opponent can update own progress" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = opponent_id
  AND status = 'active'
);