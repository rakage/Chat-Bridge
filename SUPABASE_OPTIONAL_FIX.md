# Supabase Optional Fix

## Problem Fixed

The application was throwing errors when fetching last seen messages:
```
TypeError: fetch failed
Failed to fetch last seen data: TypeError: fetch failed
```

This was happening because the Supabase client was not configured, but the code was trying to call Supabase RPC functions anyway.

## Solution

The `src/lib/supabase.ts` file has been updated to gracefully handle missing Supabase configuration:

1. **No more crashes** - If Supabase is not configured, the client will be `null` and functions will return empty results instead of throwing errors
2. **Graceful degradation** - Last seen tracking will be skipped if Supabase is unavailable
3. **Clear warnings** - Console logs warn when Supabase features are disabled

## Configuration (Optional)

If you want to enable Supabase features (vector search and last seen tracking), add these to your `.env` file:

```env
# Supabase (optional - for vector search and last seen tracking)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Setup Supabase (if needed)

1. Create a Supabase project at https://supabase.com
2. Run the SQL setup script: `supabase-setup.sql`
3. Get your project URL and keys from the Supabase dashboard
4. Add them to your `.env` file

## What Works Without Supabase

- ✅ Core chatbot functionality
- ✅ Conversations and messages
- ✅ Facebook/Instagram integration
- ✅ Real-time messaging
- ✅ Bot responses
- ❌ Vector search for RAG (will fallback to empty results)
- ❌ Last seen tracking (will use conversation metadata fallback)

## Backup

The original file has been backed up to: `src/lib/supabase-old.ts.backup`
