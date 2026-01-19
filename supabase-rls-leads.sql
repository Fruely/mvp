-- RLS Policies for leads table
-- Run these queries in Supabase SQL Editor

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert leads" ON leads;
DROP POLICY IF EXISTS "Allow service role full access" ON leads;
DROP POLICY IF EXISTS "Specialists can read own leads" ON leads;

-- Policy: Allow public to insert leads (from LeadForm)
CREATE POLICY "Allow public insert leads"
ON leads
FOR INSERT
TO public
WITH CHECK (true);

-- No SELECT policies on leads:
-- - anon/authenticated users cannot read leads directly
-- - reading is only possible via server-side admin API (service role bypasses RLS)

-- Note: Service role automatically bypasses RLS
