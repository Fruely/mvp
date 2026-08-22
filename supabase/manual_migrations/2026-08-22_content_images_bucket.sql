-- Content Hub image storage bucket
-- Run manually in Supabase Dashboard → SQL Editor:
--
-- This creates a public bucket for Content Hub featured images.
-- No RLS policies needed: uploads go through service role via admin API route.

INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;
