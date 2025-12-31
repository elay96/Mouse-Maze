// Mouse Maze Type Definitions - NetLogo Spatial Foraging Adaptation

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

// ============ AGENT STATE ============
export interface AgentState extends Position {
  heading: number;  // degrees, 0 = right, 90 = up, 180 = left, 270 = down
  velocity: number; // constant forward speed
}

export interface ClusterParams {
  k: number;
  centers: Array<{
    x: number;
    y: number;
    radius: number;
  }>;
}

// ============ REWARD/RESOURCE TYPES ============
export interface Reward extends Position {
  id: number;
  collected: boolean;
  timestampCollected?: string; // ISO 8601
}

// Alias for clarity with NetLogo terminology
export type Resource = Reward;

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
  mazeCompleted?: boolean; // Whether Phase 1 maze training is complete
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
  resourcePositions?: Reward[]; // NetLogo style: resource positions
  clusterParams?: ClusterParams;
  endReason?: 'all_rewards' | 'timeout';
  // Legacy fields for backward compat
  blackPixelPositions?: Position[];
  rewardPositions?: Reward[];
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
  heading: number;           // agent direction in degrees (0=right, 90=up)
  velocity: number;          // pixels/second (constant for agent-based movement)
  distanceFromLast: number;  // Euclidean distance in pixels
  acceleration: number;      // change in velocity (typically 0 for constant speed)
  foodHere: boolean;         // Was a resource collected at this sample?
}

// ============ EVENT TYPES ============
export type EventType = 
  | 'round_start' 
  | 'reward_hit' 
  | 'round_end' 
  | 'timeout' 
  | 'maze_start'      // Phase 1: Started maze training
  | 'maze_collision'  // Phase 1: Hit a wall, reset to start
  | 'maze_complete'   // Phase 1: Reached target
  | 'key_press'       // Keyboard input event (J/L)
  | 'key_release'     // Keyboard input event (J/L)
  | 'mouse_enter'     // Legacy: mouse entered canvas
  | 'mouse_leave';    // Legacy: mouse left canvas

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
    key?: 'A' | 'D' | 'ArrowLeft' | 'ArrowRight';  // For key events
    agentPosition?: Position; // Agent position at event time
    agentHeading?: number;    // Agent heading at event time
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
  
  // Rotation patterns (new for agent-based movement)
  totalRotations: number;        // count of direction changes
  meanTurnAngle: number;         // average turn magnitude in degrees
  
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
  | 'maze_training'    // Phase 1: Navigate maze to target
  | 'game'             // Phase 2: Foraging rounds (kept for compatibility)
  | 'foraging'         // Phase 2: Alias for 'game'
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
  mazeCompleted: boolean;       // Whether Phase 1 is complete
  isAdmin: boolean;
}

// Helper to check if session has new profile fields
export function hasParticipantProfile(session: Session): boolean {
  return !!(session.fullName && session.age && session.gender);
}
