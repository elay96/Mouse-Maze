-- Mouse Maze Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ,
  rounds_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  consent_timestamp TIMESTAMPTZ NOT NULL,
  config JSONB NOT NULL,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_condition ON sessions(condition);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  condition TEXT NOT NULL,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ,
  duration_ms INTEGER,
  rewards_collected INTEGER DEFAULT 0,
  black_pixel_positions JSONB NOT NULL,
  reward_positions JSONB NOT NULL,
  cluster_params JSONB,
  end_reason TEXT,
  UNIQUE(session_id, round_index)
);

CREATE INDEX IF NOT EXISTS idx_rounds_session ON rounds(session_id);

-- Movements table (can be large - may want to optimize later)
CREATE TABLE IF NOT EXISTS movements (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  round_index INTEGER NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  timestamp_abs TIMESTAMPTZ NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  velocity REAL NOT NULL,
  distance_from_last REAL NOT NULL,
  acceleration REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_session ON movements(session_id);
CREATE INDEX IF NOT EXISTS idx_movements_round ON movements(session_id, round_index);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  timestamp_abs TIMESTAMPTZ NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_round ON events(session_id, round_index);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert/select for all tables (for public access)
-- Adjust these policies based on your security requirements

CREATE POLICY "Allow anonymous insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON sessions FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON rounds FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON rounds FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON rounds FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON movements FOR SELECT USING (true);
CREATE POLICY "Allow anonymous delete" ON movements FOR DELETE USING (true);

CREATE POLICY "Allow anonymous insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous delete" ON events FOR DELETE USING (true);

