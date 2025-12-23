// Supabase Configuration
// Create a project at https://supabase.com and add your credentials

import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase project settings -> API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

