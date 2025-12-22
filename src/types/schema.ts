// Mouse Maze Type Definitions

import type { Condition } from '../config/constants';

// ============ GENDER TYPE ============
export type Gender = 'male' | 'female' | 'other';

// ============ PARTICIPANT PROFILE ============
export interface ParticipantProfile {
  participantKey: string;
  fullName: string;
  age: number;
  gender: Gender;
  assignedCondition: Condition;
  createdAt: string; // ISO 8601
}

// ============ POSITION TYPES ============
export interface Position {
  x: number;
  y: number;
}

export interface ClusterParams {
  k: number;
  centers: Array<{
    x: number;
    y: number;
    radius: number;
  }>;
}

// ============ REWARD TYPES ============
export interface Reward extends Position {
  id: number;
  collected: boolean;
  timestampCollected?: string; // ISO 8601
}

// ============ SESSION TYPES ============
export interface SessionConfig {
  canvasSize: number;
  nRewards: number;
  hitRadius: number;
  timeLimitMs: number;
  nRounds: number;
}

export interface Session {
  sessionId: string;
  participantId: string; // participantKey for new sessions, legacy id for old
  condition: Condition;
  startTimestamp: string; // ISO 8601
  endTimestamp?: string;  // ISO 8601
  roundsCompleted: number;
  status: 'in_progress' | 'complete' | 'incomplete';
  consentTimestamp: string;
  config: SessionConfig;
  // New fields for participant profile (optional for backward compat)
  fullName?: string;
  age?: number;
  gender?: Gender;
}

// ============ ROUND TYPES ============
export interface Round {
  sessionId: string;
  roundIndex: number;
  condition: Condition;
  startTimestamp: string;
  endTimestamp?: string;
  durationMs?: number;
  rewardsCollected: number;
  blackPixelPositions: Position[];
  rewardPositions: Reward[];
  clusterParams?: ClusterParams;
  endReason?: 'all_rewards' | 'timeout';
}

// ============ MOVEMENT TRACKING ============
export interface MovementSample {
  id?: number; // auto-increment
  sessionId: string;
  participantId: string;
  condition: Condition;
  roundIndex: number;
  timestampMs: number;       // relative to round start
  timestampAbs: string;      // ISO 8601 absolute
  x: number;
  y: number;
  velocity: number;          // pixels/second
  distanceFromLast: number;  // Euclidean distance in pixels
  acceleration: number;      // change in velocity
}

// ============ EVENT TYPES ============
export type EventType = 'round_start' | 'reward_hit' | 'round_end' | 'timeout' | 'mouse_enter' | 'mouse_leave';

export interface GameEvent {
  id?: number; // auto-increment
  sessionId: string;
  roundIndex: number;
  eventType: EventType;
  timestampMs: number;      // relative to round start
  timestampAbs: string;     // ISO 8601
  metadata?: {
    rewardIndex?: number;
    rewardPosition?: Position;
    totalRewardsCollected?: number;
    reason?: 'all_rewards' | 'timeout';
  };
}

// ============ DERIVED STATISTICS ============
export interface RoundStats {
  sessionId: string;
  roundIndex: number;
  
  // Basic metrics
  timeToFinish: number;          // ms
  rewardsCollected: number;
  completionRate: number;        // percentage
  totalDistance: number;         // px
  meanVelocity: number;          // px/sec
  maxVelocity: number;           // px/sec
  
  // Exploration efficiency
  pathEfficiency: number;        // straight_line / total_distance
  coveragePercent: number;       // percentage of grid cells visited
  revisitRate: number;           // avg visits per visited cell
  
  // Behavioral patterns
  pausesCount: number;
  totalIdleTime: number;         // ms
  meanPauseDuration: number;     // ms
  firstRewardLatency: number;    // ms
  meanInterRewardInterval: number; // ms
  
  // Spatial bias
  edgeTimePercent: number;
  centerBias: number;
  quadrantDistribution: {
    NW: number;
    NE: number;
    SW: number;
    SE: number;
  };
}

// ============ EXPORT TYPES ============
export interface ExportData {
  session: Session;
  rounds: Array<{
    roundInfo: Round;
    movements: MovementSample[];
    events: GameEvent[];
    stats: RoundStats;
  }>;
}

// ============ APP STATE TYPES ============
export type AppScreen = 
  | 'landing'
  | 'instructions'
  | 'game'
  | 'round_transition'
  | 'completion'
  | 'admin_login'
  | 'admin_dashboard'
  | 'admin_session_detail';

export interface AppState {
  screen: AppScreen;
  participantId: string | null; // participantKey
  sessionId: string | null;
  condition: Condition | null;
  currentRound: number;
  isAdmin: boolean;
}

// Helper to check if session has new profile fields
export function hasParticipantProfile(session: Session): boolean {
  return !!(session.fullName && session.age && session.gender);
}

