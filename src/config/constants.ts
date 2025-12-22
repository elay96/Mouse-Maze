// Mouse Maze Configuration Constants

// ============ CORE CONSTANTS ============
export const CANVAS_SIZE = 1000;           // pixels
export const N_REWARDS = 20;               // per round
export const HIT_RADIUS = 35;              // pixels, distance to trigger reward (big dots)
export const SAMPLE_RATE = 30;             // Hz, mouse position sampling frequency
export const SAMPLE_INTERVAL = Math.floor(1000 / SAMPLE_RATE); // ~33ms
export const TIME_LIMIT = 30000;           // milliseconds (30 seconds per round)
export const N_ROUNDS = 5;                 // total rounds per session

// ============ CLUSTER CONDITION PARAMETERS ============
export const CLUSTER_K_MIN = 2;            // minimum number of clusters
export const CLUSTER_K_MAX = 3;            // maximum number of clusters
export const CLUSTER_RADIUS = 80;          // pixels, radius of circular cluster region (tighter clusters)
export const CLUSTER_MIN_SEPARATION = 250; // pixels, minimum distance between cluster centers
export const CLUSTER_EDGE_MARGIN = 150;    // pixels, minimum distance from canvas edge

export const REWARD_MIN_SPACING = 30;      // pixels, minimum distance between rewards
export const REWARD_EDGE_MARGIN = 50;      // pixels, keep rewards away from edges

// ============ NOISE CONDITION PARAMETERS ============
export const NOISE_REWARD_EDGE_MARGIN = 50; // pixels

// ============ REWARD REVEAL ============
export const REWARD_REVEAL_DURATION = 500; // ms, flash duration (rewards stay visible as gray after)
export const REWARD_DOT_SIZE = 18;         // pixels, radius of rendered reward dot

// ============ BEHAVIORAL THRESHOLDS ============
export const IDLE_VELOCITY_THRESHOLD = 5;  // px/sec, below this = idle
export const IDLE_DURATION_THRESHOLD = 500; // ms, minimum duration to count as pause
export const EDGE_REGION_WIDTH = 100;      // pixels from edge
export const GRID_SIZE = 10;               // 10×10 grid for coverage analysis (100 cells)

// ============ AUDIO FEEDBACK ============
export const REWARD_SOUND_FREQUENCY = 800; // Hz, beep tone
export const REWARD_SOUND_DURATION = 200;  // milliseconds
export const REWARD_SOUND_VOLUME = 0.3;    // 0.0 to 1.0

// ============ ADMIN SETTINGS ============
export const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'elay-guez-1334';
export const SESSION_TIMEOUT = 3600000;    // ms, 1 hour (for incomplete session detection)
export const EXPORT_BATCH_SIZE = 1000;     // rows per CSV chunk (for large exports)

// ============ UI CONSTANTS ============
export const INTER_ROUND_DELAY = 10000;    // ms, pause screen duration (10 seconds)
export const CANVAS_BACKGROUND = '#F5F5F5';
export const BLACK_PIXEL_COLOR = '#1A1A1A';
export const REWARD_HIT_COLOR = '#FFD700';

// ============ CONDITION TYPES ============
export type Condition = 'CLUSTER' | 'NOISE';

