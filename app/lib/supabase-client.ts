import { createBrowserClient } from '@supabase/ssr'

export const FALLBACK_SUPABASE_URL = 'https://xkeyonsreywpzigqmnuk.supabase.co'
export const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZXlvbnNyZXl3cHppZ3FtbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjE4MjIsImV4cCI6MjA5MjYzNzgyMn0.OL1BzqSkq23ErNwAG1s4DNJFDOVUSfrEarYBfJlsUDM'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export const getSupabase = createClient

