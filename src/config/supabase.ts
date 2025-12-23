// Supabase Configuration
// Create a project at https://supabase.com and add your credentials

import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings -> API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging
console.log('[Supabase] URL configured:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET');
console.log('[Supabase] Key configured:', SUPABASE_ANON_KEY ? 'YES (length: ' + SUPABASE_ANON_KEY.length + ')' : 'NOT SET');

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  const configured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
  console.log('[Supabase] isSupabaseConfigured:', configured);
  return configured;
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection function
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured - missing URL or Key' };
  }
  
  try {
    const { data, error } = await supabase.from('sessions').select('count').limit(1);
    if (error) {
      console.error('[Supabase] Connection test failed:', error);
      return { success: false, error: error.message };
    }
    console.log('[Supabase] Connection test SUCCESS');
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Connection test exception:', err);
    return { success: false, error: String(err) };
  }
}

// Database types for Supabase
export interface DbSession {
  session_id: string;
  participant_id: string;
  condition: string;
  start_timestamp: string;
  end_timestamp: string | null;
  rounds_completed: number;
  status: string;
  consent_timestamp: string;
  config: object;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  created_at?: string;
}

export interface DbRound {
  id?: number;
  session_id: string;
  round_index: number;
  condition: string;
  start_timestamp: string;
  end_timestamp: string | null;
  duration_ms: number | null;
  rewards_collected: number;
  black_pixel_positions: object;
  reward_positions: object;
  cluster_params: object | null;
  end_reason: string | null;
}

export interface DbMovement {
  id?: number;
  session_id: string;
  participant_id: string;
  condition: string;
  round_index: number;
  timestamp_ms: number;
  timestamp_abs: string;
  x: number;
  y: number;
  velocity: number;
  distance_from_last: number;
  acceleration: number;
}

export interface DbEvent {
  id?: number;
  session_id: string;
  round_index: number;
  event_type: string;
  timestamp_ms: number;
  timestamp_abs: string;
  metadata: object | null;
}

