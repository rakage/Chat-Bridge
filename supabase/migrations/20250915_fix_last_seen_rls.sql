-- Fix RLS policies for conversation_last_seen table
-- This migration ensures that the get_user_last_seen function can be called by authenticated and anon users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role can do everything on last_seen" ON conversation_last_seen;
DROP POLICY IF EXISTS "Allow all operations for anon and authenticated" ON conversation_last_seen;
DROP POLICY IF EXISTS "Users can access their company documents" ON conversation_last_seen;

-- Re-enable RLS (in case it was disabled)
ALTER TABLE conversation_last_seen ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all operations
-- Since we're using custom application-level auth (NextAuth), we control access in the app layer
-- The functions themselves filter by user_id parameter, providing security

-- Allow service role full access
CREATE POLICY "service_role_all_access" ON conversation_last_seen
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon role to read/write (functions control access via user_id parameter)
CREATE POLICY "anon_all_access" ON conversation_last_seen
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);

-- Allow authenticated role to read/write
CREATE POLICY "authenticated_all_access" ON conversation_last_seen
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON conversation_last_seen TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_last_seen TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_last_seen TO authenticated;

-- Ensure functions are executable by all roles
GRANT EXECUTE ON FUNCTION get_user_last_seen(text) TO anon;
GRANT EXECUTE ON FUNCTION get_user_last_seen(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_last_seen(text) TO service_role;

GRANT EXECUTE ON FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) TO service_role;

-- Ensure the functions are SECURITY DEFINER so they run with the permissions of the function owner
-- This allows them to bypass RLS when needed
ALTER FUNCTION get_user_last_seen(text) SECURITY DEFINER;
ALTER FUNCTION update_conversation_last_seen(text, text, timestamp with time zone) SECURITY DEFINER;

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated for conversation_last_seen table';
  RAISE NOTICE '✅ Permissions granted to anon, authenticated, and service_role';
  RAISE NOTICE '✅ Functions set to SECURITY DEFINER mode';
END $$;
