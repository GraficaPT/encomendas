import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const SUPABASE_URL  = 'https://nbcmqkcztuogflejswau.supabase.co'
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY21xa2N6dHVvZ2ZsZWpzd2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2ODY4OTMsImV4cCI6MjA2NTI2Mjg5M30.Rf4yHxgo_bh56tXwHn3jJgJQr0tOCbXc2rQU1R26tv8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
