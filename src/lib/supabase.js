import { createClient } from '@supabase/supabase-js'

// The publishable key is meant to live in the browser; Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://gacxhkxtzdwlugokwzbh.supabase.co'
const key = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_9WLfHmhZ5-BVt0p27huPWA_BjvED53G'

export const supabase = createClient(url, key)
