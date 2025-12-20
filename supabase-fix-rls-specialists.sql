-- Enable RLS if it's disabled
-- ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- For service role: allow all operations
-- Create a policy for service role (which has unrestricted access)
CREATE POLICY "Service role bypass for all operations"
ON specialists
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- For anon/authenticated: allow read only on approved
CREATE POLICY "Allow anon/auth to read approved"
ON specialists
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Drop existing policies if conflicts
-- DROP POLICY IF EXISTS "Allow anon/auth to read approved" ON specialists;
-- DROP POLICY IF EXISTS "Service role bypass for all operations" ON specialists;
