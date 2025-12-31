// Mouse Maze Configuration Constants - NetLogo Spatial Foraging Adaptation

// ============ CORE CONSTANTS ============
export const CANVAS_SIZE = 1000;           // pixels
export const N_REWARDS = 700;              // per round (diffuse: ~700, concentrated: ~700 distributed in 4 clusters)
export const HIT_RADIUS = 5;               // pixels, distance to trigger reward (agent size based)
export const SAMPLE_RATE = 10;             // Hz, agent position sampling frequency (NetLogo spec: 10Hz)
export const SAMPLE_INTERVAL = Math.floor(1000 / SAMPLE_RATE); // 100ms
export const TIME_LIMIT = 60000;           // milliseconds (60 seconds per round)
export const N_ROUNDS = 5;                 // total foraging rounds per session

// ============ AGENT PHYSICS ============
export const AGENT_SPEED = 3;              // pixels per frame (constant forward velocity)
export const AGENT_ROTATION_SPEED = 5;     // degrees per frame when rotating
export const AGENT_SIZE = 15;              // pixels, triangle size for rendering
export const AGENT_START_X = CANVAS_SIZE / 2; // starting X position
export const AGENT_START_Y = CANVAS_SIZE / 2; // starting Y position
export const AGENT_START_HEADING = 90;     // degrees (0 = right, 90 = up)
export const GAME_FPS = 60;                // target frames per second
export const FRAME_INTERVAL = Math.floor(1000 / GAME_FPS); // ~16.67ms

// ============ CONCENTRATED CONDITION PARAMETERS ============
// 4 dense clusters (NetLogo: 4 seed points expanded 20 times)
export const CONCENTRATED_N_CLUSTERS = 4;  // number of cluster centers
export const CONCENTRATED_EXPANSION = 20;  // expansion iterations per seed
export const CONCENTRATED_CLUSTER_RADIUS = 100; // pixels, radius per cluster
export const CONCENTRATED_MIN_SEPARATION = 300; // pixels, minimum distance between cluster centers
export const CONCENTRATED_EDGE_MARGIN = 150; // pixels, minimum distance from canvas edge

// ============ DIFFUSE CONDITION PARAMETERS ============
// Scattered resources (~700 seed points + neighbors)
export const DIFFUSE_N_SEEDS = 700;        // number of seed points
export const DIFFUSE_EDGE_MARGIN = 50;     // pixels, keep resources away from edges

// ============ REWARD SPACING ============
export const REWARD_MIN_SPACING = 10;      // pixels, minimum distance between rewards
export const REWARD_EDGE_MARGIN = 30;      // pixels, keep rewards away from edges

// ============ MAZE TRAINING CONSTANTS ============
export const MAZE_WALL_THICKNESS = 20;     // pixels
export const MAZE_TARGET_SIZE = 50;        // pixels, red target square
export const MAZE_START_X = 100;           // agent start X in maze (bottom-left)
export const MAZE_START_Y = CANVAS_SIZE - 100; // agent start Y in maze (bottom-left)
export const MAZE_TARGET_X = CANVAS_SIZE - 100 - MAZE_TARGET_SIZE; // target X in maze (top-right area)
export const MAZE_TARGET_Y = 100;          // target Y in maze (top-left area)

// ============ VISUAL COLORS (NetLogo Style) ============
export const CANVAS_BACKGROUND = '#000000'; // Black background (resources hidden)
export const RESOURCE_COLLECTED_COLOR = '#0066FF'; // Blue when collected
export const AGENT_COLOR = '#FFFF00';      // Yellow triangle
export const MAZE_WALL_COLOR = '#0066FF';  // Blue walls
export const MAZE_TARGET_COLOR = '#FF0000'; // Red target

// Legacy colors for backward compatibility
export const BLACK_PIXEL_COLOR = '#1A1A1A';
export const REWARD_HIT_COLOR = '#FFD700';
export const REWARD_REVEAL_DURATION = 500; // ms
export const REWARD_DOT_SIZE = 18;         // pixels

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
export const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'kinneret-lab-1234';
export const SESSION_TIMEOUT = 3600000;    // ms, 1 hour (for incomplete session detection)
export const EXPORT_BATCH_SIZE = 1000;     // rows per CSV chunk (for large exports)

// ============ UI CONSTANTS ============
export const INTER_ROUND_DELAY = 10000;    // ms, pause screen duration (10 seconds)
export const START_COUNTDOWN_SECONDS = 5;  // seconds countdown before round starts

// ============ CONDITION TYPES ============
export type Condition = 'CONCENTRATED' | 'DIFFUSE';
