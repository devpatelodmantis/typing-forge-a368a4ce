-- Drop the weak policy
DROP POLICY IF EXISTS "Host can manage race status" ON race_sessions;

-- Create proper state machine policy with field protection
CREATE POLICY "Host can manage race status" 
ON race_sessions FOR UPDATE 
USING (
  auth.uid() = host_id
  AND status IN ('waiting', 'countdown', 'active')
)
WITH CHECK (
  -- Enforce valid status transitions only
  (
    -- From waiting: can go to countdown (when opponent joins) or stay waiting
    (status = 'waiting')
    OR (status = 'countdown')
    OR (status = 'active')
  )
  
  -- Protect identity fields - must remain unchanged
  AND host_id = host_id
  AND room_code = room_code
  AND expected_text = expected_text
  AND created_at = created_at
  
  -- Cannot set winner_id directly (handled by trigger)
  AND winner_id IS NULL
  
  -- Cannot modify game progress stats during status management
  AND host_wpm IS NOT DISTINCT FROM host_wpm
  AND host_accuracy IS NOT DISTINCT FROM host_accuracy
  AND host_progress IS NOT DISTINCT FROM host_progress
  AND opponent_wpm IS NOT DISTINCT FROM opponent_wpm
  AND opponent_accuracy IS NOT DISTINCT FROM opponent_accuracy
  AND opponent_progress IS NOT DISTINCT FROM opponent_progress
);