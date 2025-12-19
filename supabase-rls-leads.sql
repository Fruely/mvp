-- RLS Policies for leads table
-- Run these queries in Supabase SQL Editor

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert leads" ON leads;
DROP POLICY IF EXISTS "Allow service role full access" ON leads;

-- Policy: Allow public to insert leads (from LeadForm)
CREATE POLICY "Allow public insert leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Allow specialists to read their own leads
CREATE POLICY "Specialists can read own leads"
ON leads
FOR SELECT
TO authenticated
USING (specialist_id = auth.uid()::text);

-- Note: Service role automatically bypasses RLS
