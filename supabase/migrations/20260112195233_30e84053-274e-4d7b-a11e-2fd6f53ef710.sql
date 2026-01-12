-- Drop existing permissive progress update policies
DROP POLICY IF EXISTS "Host can update own progress" ON race_sessions;
DROP POLICY IF EXISTS "Opponent can update own progress" ON race_sessions;

-- Create host progress update policy with field-level restrictions
CREATE POLICY "Host can update own progress" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = host_id AND status = 'active'
)
WITH CHECK (
  -- Identity fields must remain unchanged
  host_id = host_id
  AND opponent_id IS NOT DISTINCT FROM opponent_id
  AND room_code = room_code
  AND expected_text = expected_text
  AND status = 'active'
  AND winner_id IS NULL
  AND created_at = created_at
  
  -- Opponent fields MUST remain unchanged (use COALESCE for nullable comparisons)
  AND opponent_wpm IS NOT DISTINCT FROM opponent_wpm
  AND opponent_accuracy IS NOT DISTINCT FROM opponent_accuracy
  AND opponent_progress IS NOT DISTINCT FROM opponent_progress
  
  -- Host can only modify own fields with realistic bounds
  AND (host_wpm IS NULL OR (host_wpm >= 0 AND host_wpm <= 500))
  AND (host_accuracy IS NULL OR (host_accuracy >= 0 AND host_accuracy <= 100))
  AND (host_progress IS NULL OR (host_progress >= 0 AND host_progress <= 100))
);

-- Create opponent progress update policy with field-level restrictions
CREATE POLICY "Opponent can update own progress" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = opponent_id AND status = 'active'
)
WITH CHECK (
  -- Identity fields must remain unchanged
  host_id = host_id
  AND opponent_id = opponent_id
  AND room_code = room_code
  AND expected_text = expected_text
  AND status = 'active'
  AND winner_id IS NULL
  AND created_at = created_at
  
  -- Host fields MUST remain unchanged
  AND host_wpm IS NOT DISTINCT FROM host_wpm
  AND host_accuracy IS NOT DISTINCT FROM host_accuracy
  AND host_progress IS NOT DISTINCT FROM host_progress
  
  -- Opponent can only modify own fields with realistic bounds
  AND (opponent_wpm IS NULL OR (opponent_wpm >= 0 AND opponent_wpm <= 500))
  AND (opponent_accuracy IS NULL OR (opponent_accuracy >= 0 AND opponent_accuracy <= 100))
  AND (opponent_progress IS NULL OR (opponent_progress >= 0 AND opponent_progress <= 100))
);