import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const SUPABASE_URL  = 'https://neylqqdzdjxinzrhatjx.supabase.co'
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5leWxxcWR6ZGp4aW56cmhhdGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTI1MTQsImV4cCI6MjA2NzgyODUxNH0.hNTtAIDmVgM1WuFlQ2594RNYrlf8gECPERI-12XUmTc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
