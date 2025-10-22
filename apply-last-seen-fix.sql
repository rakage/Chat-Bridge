-- Quick fix script for conversation_last_seen RLS issues
-- Run this directly in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can do everything on last_seen" ON conversation_last_seen;
DROP POLICY IF EXISTS "Allow all operations for anon and authenticated" ON conversation_last_seen;

-- Create new permissive policies
CREATE POLICY "service_role_full_access" ON conversation_last_seen
FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "anon_full_access" ON conversation_last_seen
FOR ALL TO anon
USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON conversation_last_seen
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON conversation_last_seen TO service_role;
GRANT ALL ON conversation_last_seen TO anon;
GRANT ALL ON conversation_last_seen TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_last_seen(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) TO anon, authenticated, service_role;

-- Make functions SECURITY DEFINER
ALTER FUNCTION get_user_last_seen(text) SECURITY DEFINER;
ALTER FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) SECURITY DEFINER;

SELECT 'RLS policies fixed!' as status;
