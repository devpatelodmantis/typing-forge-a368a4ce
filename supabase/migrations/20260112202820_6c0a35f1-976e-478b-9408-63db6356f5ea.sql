-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create restricted policy for authenticated users only
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);