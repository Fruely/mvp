-- RLS Policies for specialists table
-- Run these queries in Supabase SQL Editor

-- Enable RLS on specialists table (if not already enabled)
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow service role full access" ON specialists;
DROP POLICY IF EXISTS "Allow public read approved specialists" ON specialists;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON specialists;

-- Policy 1: Service role has full access (bypasses RLS automatically)
-- This is built-in, no policy needed

-- Policy 2: Public can read only approved specialists
-- (Not strictly needed since we use server API, but good for direct queries)
CREATE POLICY "Allow public read approved specialists"
ON specialists
FOR SELECT
TO public
USING (status = 'approved');

-- Policy 3: Allow anonymous inserts (for become-specialist form)
-- Only if you want direct client-side inserts, otherwise remove this
CREATE POLICY "Allow anonymous insert pending specialists"
ON specialists
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- Alternative: Disable all public access and rely only on server API
-- DROP POLICY IF EXISTS "Allow public read approved specialists" ON specialists;
-- DROP POLICY IF EXISTS "Allow anonymous insert pending specialists" ON specialists;
