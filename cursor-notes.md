# Mouse Maze - Research Instrument Specification

## 1. High-Level Goal

**Project:** Mouse Maze - A behavioral research tool for studying exploration strategies in spatial foraging tasks.

**Purpose:** 
- Study how participants explore a 2D space to find hidden rewards
- Compare exploration strategies under two environmental conditions: structured (CLUSTER) vs unstructured (NOISE)
- Collect high-fidelity mouse movement data for behavioral analysis

**Core Design:**
- Two experimental conditions: CLUSTER (spatial structure) vs NOISE (random distribution)
- Each participant completes 4-5 rounds within a single assigned condition
- Condition assignment persists across all rounds for within-subject consistency
- Research-grade data logging at 30 Hz sampling rate
- Fully local, no external services or data transmission

---

## 2. Screens and Flow

### 2.1 Participant Flow

**A. Landing Screen**
- Display research consent information (IRB-style text)
- Checkbox: "I consent to participate"
- Input field: Participant ID (required, alphanumeric)
- Button: "Begin Study" (disabled until consent checked and ID entered)
- Validation: participant_id must be 3-20 characters

**B. Condition Assignment**
- Occurs automatically on first entry
- Random assignment to CLUSTER or NOISE (50/50)
- Assignment stored with participant_id in localStorage
- If participant returns with same ID, retrieve existing condition
- Display brief instructions screen:
  - "Move your mouse to explore the canvas"
  - "Find hidden rewards (you'll hear a sound when you find one)"
  - "Complete 5 rounds"
  - Button: "Start Round 1"

**C. Round Gameplay (repeated 4-5 times)**
- Display: Round number (1-5), Current score, Timer (countdown from time limit)
- Canvas: 1000x1000px with black pixel pattern and hidden rewards
- Real-time tracking of mouse position
- Audio feedback on reward collection (short beep/chime)
- Score increments with each reward
- Round ends when:
  - All 40 rewards found, OR
  - Time limit reached (e.g., 120 seconds)
- Transition: "Round complete! Score: X/40" → "Next Round" button
- Between rounds: 3-second rest screen

**D. Completion Screen**
- Summary statistics:
  - Total rewards collected across all rounds
  - Total time spent
  - Average rewards per round
- Thank you message
- Buttons:
  - "Download My Data (JSON)" - downloads session data
  - "Finish and Exit" - returns to landing

### 2.2 Admin Flow

**A. Admin Login**
- Access via special route: `/admin`
- Single password input field
- Passcode stored in environment variable or config file (e.g., `ADMIN_PASSCODE=research2024`)
- Session-based auth (valid for browser session only)
- No "forgot password" - purely local access control

**B. Admin Dashboard**
- Table of all sessions with columns:
  - Session ID (unique)
  - Participant ID
  - Condition (CLUSTER/NOISE)
  - Date/Time
  - Rounds completed
  - Total rewards collected
  - Status (complete/incomplete)
- Sorting: by date (most recent first)
- Search/filter: by participant_id or condition
- Actions per row:
  - "View Details" → Session detail page
  - "Export CSV" → download session data
- Bulk action: "Export All Sessions"

**C. Session Detail Page**
- Header: Participant ID, Condition, Session timestamp
- Per-round statistics table (see section 6)
- Path replay visualizations (see section 6)
- Export buttons: JSON, CSV

---

## 3. Canvas Mechanics

### 3.1 Canvas Specifications
- **Dimensions:** 1000 × 1000 logical pixels
- **Background:** Light gray (#E5E5E5) or white (#FFFFFF)
- **Border:** 2px solid black for clear boundary

### 3.2 Black Pixels (Visible Cues)
- **Purpose:** Visual environment structure that differs by condition
- **Rendering:** Individual black pixels or small dots (2-3px diameter)
- **Visibility:** Fully visible throughout round
- **Non-interactive:** No game mechanics tied to black pixels, purely environmental cue

**CLUSTER Condition:**
- Generate 2-3 clusters using Gaussian distributions
- Each cluster: 
  - Center: random (x, y) at least 200px from edges and 250px from other cluster centers
  - Spread: σ = 80-120 pixels (randomized per cluster)
  - Density: ~300-500 black pixels per cluster
  - Total: ~900-1500 black pixels on canvas

**NOISE Condition:**
- Uniform random distribution across canvas
- Total: ~1200 black pixels
- Minimum spacing: 3px between any two pixels (prevent clumping)

### 3.3 Hidden Rewards
- **Count:** 40 rewards per round
- **Visibility:** Completely hidden (no visual marker)
- **Hit Detection:** 
  - Triggered when mouse cursor enters within hit radius of reward center
  - Default hit radius: 8px (configurable)
  - One-time collection: reward disappears after collection
- **Feedback:**
  - Audio: 200ms beep (pleasant tone, ~800 Hz)
  - Visual: Score counter increments immediately
  - No visual effect on canvas (maintains hidden nature)

**Reward Placement:**
- **CLUSTER Condition:**
  - Rewards clustered using same Gaussian centers as black pixels
  - Each reward: sample from one of the K=2-3 Gaussians
  - σ_rewards = σ_black_pixels * 0.8 (slightly tighter than visual cues)
  - Ensures spatial correlation between cues and rewards
  
- **NOISE Condition:**
  - Uniform random placement across canvas
  - Minimum spacing: 30px between any two rewards (prevent accidental double-hits)
  - No correlation with black pixel positions

### 3.4 Mouse Tracking
- Track mouse position whenever cursor is over canvas
- Sample at 30 Hz (every ~33.33ms) using `setInterval` or `requestAnimationFrame` with throttle
- Log position even if mouse is stationary
- Cursor: default pointer (no custom cursor needed)

---

## 4. Condition Definitions

### 4.1 CLUSTER Condition

**Environmental Structure:**
- **Black Pixel Clusters:** K = 2 or 3 (randomly chosen at round start)
- **Cluster Generation Algorithm:**
  1. Choose K ∈ {2, 3} uniformly
  2. For each cluster i:
     - Sample center: (μx_i, μy_i) 
       - μx_i ~ Uniform(200, 800)
       - μy_i ~ Uniform(200, 800)
       - Constraint: distance to other centers ≥ 250px
     - Sample spread: σ_i ~ Uniform(80, 120)
     - Generate N_i ~ Uniform(300, 500) black pixels
     - For each pixel j:
       - x_j ~ Normal(μx_i, σ_i), clamp to [0, 1000]
       - y_j ~ Normal(μy_i, σ_i), clamp to [0, 1000]

**Reward Distribution:**
- Same K clusters as black pixels
- For each of 40 rewards:
  - Assign to cluster i with probability proportional to cluster size
  - Sample position from Normal(μx_i, 0.8*σ_i), Normal(μy_i, 0.8*σ_i)
  - Clamp to [50, 950] to avoid edge placement
  - Check minimum spacing (30px) and resample if violated

**Hypothesis:** Participants should learn spatial structure and focus exploration in clustered regions.

### 4.2 NOISE Condition

**Environmental Structure:**
- **Black Pixels:** N = 1200 pixels
- **Placement Algorithm:**
  1. Generate candidate positions:
     - x ~ Uniform(0, 1000)
     - y ~ Uniform(0, 1000)
  2. Accept if distance to all existing pixels ≥ 3px
  3. Repeat until 1200 pixels placed (with max attempts limit, then reduce spacing)

**Reward Distribution:**
- Uniform random across canvas
- For each of 40 rewards:
  - x ~ Uniform(50, 950)
  - y ~ Uniform(50, 950)
  - Check minimum spacing (30px) from other rewards
  - Resample if violated (max 100 attempts, then reduce spacing threshold)

**Hypothesis:** Participants should use uniform exploration strategy; no exploitation of spatial structure.

---

## 5. Tracking + Logging Plan (Research-Grade)

### 5.1 Sampling Specifications
- **Sample Rate:** 30 Hz (every 33.33ms)
- **Method:** `setInterval` with 33ms delay, or `requestAnimationFrame` with timestamp throttle
- **Coverage:** Log regardless of mouse movement (captures stationary periods)
- **Start:** Logging begins when round starts (timer begins)
- **End:** Logging stops when round ends (all rewards or timeout)

### 5.2 Data Schema

**Session-Level Data:**
```
{
  session_id: string (UUID v4)
  participant_id: string
  condition: "CLUSTER" | "NOISE"
  start_timestamp: ISO 8601 string
  end_timestamp: ISO 8601 string
  rounds_completed: number
  config: {
    canvas_size: 1000
    n_rewards: 40
    hit_radius: 8
    time_limit_ms: 120000
    n_rounds: 5
  }
}
```

**Round-Level Data:**
```
{
  session_id: string
  round_index: number (0-4)
  condition: "CLUSTER" | "NOISE"
  start_timestamp: ISO 8601
  end_timestamp: ISO 8601
  duration_ms: number
  rewards_collected: number
  black_pixel_positions: Array<{x: number, y: number}>
  reward_positions: Array<{x: number, y: number, collected: boolean, timestamp_collected?: ISO 8601}>
  cluster_params?: {
    k: number
    centers: Array<{x: number, y: number, sigma: number}>
  }
}
```

**Mouse Movement Data (per sample):**
```
{
  session_id: string
  participant_id: string
  condition: string
  round_index: number
  timestamp_ms: number (relative to round start)
  timestamp_abs: ISO 8601 (absolute)
  x: number
  y: number
  velocity: number (pixels/second, computed from last sample)
  distance_from_last: number (Euclidean distance in pixels)
  acceleration: number (computed from velocity changes)
}
```

**Event Data:**
```
{
  session_id: string
  round_index: number
  event_type: "round_start" | "reward_hit" | "round_end" | "timeout"
  timestamp_ms: number (relative to round start)
  timestamp_abs: ISO 8601
  metadata?: {
    reward_index?: number
    reward_position?: {x: number, y: number}
    total_rewards_collected?: number
    reason?: "all_rewards" | "timeout"
  }
}
```

### 5.3 Derived Metrics (Computed at Export)
- **Velocity:** `sqrt((x_t - x_{t-1})^2 + (y_t - y_{t-1})^2) / (time_t - time_{t-1}) * 1000` (px/sec)
- **Acceleration:** Change in velocity per sample
- **Idle Detection:** Velocity < 5 px/sec for > 500ms consecutive samples
- **Path Length:** Cumulative sum of distance_from_last
- **Coverage:** Percentage of 10×10 grid cells visited (100×100 px cells)

### 5.4 Data Retention Strategy

**Storage Solution: IndexedDB (preferred)**

**Justification:**
- **IndexedDB over localStorage:**
  - Quota: 50MB+ (vs ~5-10MB for localStorage)
  - Storage: Structured data with indexing (faster queries)
  - Performance: Asynchronous API (non-blocking)
  - Data types: Native support for objects, arrays, Blobs
  - Research needs: High-frequency samples (30 Hz) generate large datasets
  - Example: 5 rounds × 120 sec × 30 Hz = 18,000 samples per session
    - With full schema: ~500 KB per session
    - 100 participants: ~50 MB total (within limits)

**Database Schema:**
```
Database: "MouseMazeDB"
Version: 1

Object Stores:
1. "sessions" (keyPath: "session_id")
   - Indexes: participant_id, condition, start_timestamp

2. "rounds" (keyPath: ["session_id", "round_index"])
   - Indexes: session_id

3. "movements" (autoIncrement key)
   - Indexes: session_id, round_index, timestamp_abs
   - Note: Store in batches of 100 samples for write efficiency

4. "events" (autoIncrement key)
   - Indexes: session_id, round_index, event_type
```

**Data Lifecycle:**
- Write: Batch movements every 100 samples (~3.3 seconds)
- Read: Admin dashboard queries by session_id
- Export: Serialize to JSON or CSV on demand
- Cleanup: Admin button to delete old sessions (optional)

### 5.5 Export Formats

**JSON Export (Full Fidelity):**
```json
{
  "session": { /* session metadata */ },
  "rounds": [
    {
      "round_info": { /* round metadata */ },
      "movements": [ /* array of movement samples */ ],
      "events": [ /* array of events */ ]
    }
  ],
  "derived_stats": { /* computed metrics per round */ }
}
```

**CSV Export (Flat, Analysis-Ready):**
```
movements.csv:
session_id,participant_id,condition,round_index,timestamp_ms,x,y,velocity,distance_from_last

events.csv:
session_id,round_index,event_type,timestamp_ms,reward_index,reward_x,reward_y

rounds_summary.csv:
session_id,round_index,duration_ms,rewards_collected,total_distance,mean_velocity,coverage_percent
```

---

## 6. Admin Statistics and Visualization

### 6.1 Per-Round Statistics

**Basic Metrics:**
- `time_to_finish`: Duration from round start to end (ms or seconds)
- `rewards_collected`: Count (0-40)
- `completion_rate`: rewards_collected / 40 * 100 (%)
- `total_distance`: Sum of Euclidean distances between consecutive samples (px)
- `mean_velocity`: Mean of all velocity samples (px/sec)
- `max_velocity`: Maximum velocity (px/sec)

**Exploration Efficiency:**
- `path_efficiency`: (straight_line_distance_first_to_last) / total_distance
  - Values near 1.0: direct path
  - Values near 0: highly exploratory/winding
- `coverage_percent`: Percentage of 10×10 grid cells visited at least once
  - Grid: 100×100 px cells (10×10 grid = 100 cells total)
  - Compute: unique cells visited / 100 * 100
- `revisit_rate`: Average number of visits per visited cell (total_samples / unique_cells_visited)

**Behavioral Patterns:**
- `pauses_count`: Number of idle periods (velocity < 5 px/sec for > 500ms)
- `total_idle_time`: Sum of all pause durations (ms)
- `mean_pause_duration`: total_idle_time / pauses_count
- `first_reward_latency`: Time to first reward collection (ms)
- `inter_reward_interval`: Mean time between consecutive reward hits

**Spatial Bias:**
- `edge_time_percent`: Percentage of time spent within 100px of canvas edge
- `center_bias`: Ratio of time in center 400×400 region vs edges
- `quadrant_distribution`: Time spent in each quadrant (NW, NE, SW, SE) as percentages

### 6.2 Path Replay Visualization

**Replay Canvas:**
- Same dimensions as game canvas (1000×1000)
- Background: light gray
- Render layers:
  1. Black pixels (faded, 30% opacity)
  2. Reward positions (small circles, green=collected, gray=missed)
  3. Mouse path (polyline connecting samples)
  4. Current position marker (red circle following path)

**Path Rendering:**
- Line style: 2px width, semi-transparent blue (#4285F4 at 60% opacity)
- Color gradient option: heatmap from blue (start) to red (end) to show temporal progression
- Reward hit markers: yellow star at exact collection point

**Timeline Scrubber:**
- Horizontal timeline below canvas
- Tick marks: every 10 seconds
- Reward collection events: yellow markers on timeline
- Playback controls:
  - Play/Pause button
  - Speed control: 0.5×, 1×, 2×, 5×, 10×
  - Scrub slider: drag to any point in time
- Time display: "MM:SS / MM:SS" (current / total)

**Heatmap Option:**
- Toggle: "Show Coverage Heatmap"
- Overlay: 10×10 grid with cells colored by visit frequency
- Color scale: white (0 visits) → yellow → orange → red (most visits)
- Transparency: 40% so path is still visible

### 6.3 Comparative Statistics (Across Rounds)

**Trend Visualization:**
- Line chart: rewards_collected vs round_index
- Line chart: total_distance vs round_index
- Line chart: time_to_finish vs round_index
- Purpose: Observe learning effects across rounds

**Condition Comparison (Admin sees all participants):**
- Box plots: CLUSTER vs NOISE for each metric
- Mean ± SD tables
- T-test results (if sufficient sample size)

---

## 7. Rounds Requirement

### 7.1 Configuration
- **Default:** 5 rounds per session
- **Configurable:** Admin can set N_ROUNDS in config (range: 4-10)
- **UI Display:** "Round X of N" prominently shown during gameplay

### 7.2 Round Progression
1. Each round generates new black pixel and reward layouts (randomized within condition rules)
2. Round timer resets to full time limit
3. Score persists across rounds (cumulative)
4. Brief inter-round screen (3 seconds):
   - "Round X complete!"
   - "Rewards collected: Y/40"
   - "Next round starting..."
5. After final round: automatically transition to completion screen

### 7.3 Incomplete Sessions
- If participant closes browser mid-session:
  - Session saved as "incomplete" in IndexedDB
  - If same participant_id returns: offer to "Resume Session" or "Start New Session"
  - Resume: continue from next round
  - Start New: create new session_id, keep same condition assignment

---

## 8. Security and Privacy

### 8.1 Data Privacy Principles
- **Local-Only:** All data stored in browser's IndexedDB
- **No Server:** No data transmitted to external servers
- **No PII:** Participant IDs are researcher-assigned codes (not names/emails)
- **Export Control:** Only participant can export their own data from completion screen
- **Admin Access:** Admin can view all sessions (research oversight)

### 8.2 Admin Access Control
- **Passcode:** Simple password check (not production-grade security)
- **Storage:** 
  - Option 1: Environment variable `REACT_APP_ADMIN_PASSCODE`
  - Option 2: Hardcoded in source (if deployed locally only)
  - Default: "research2024"
- **Session:** Auth persists for browser session only (sessionStorage)
- **Warning:** This is not secure against determined attackers; purpose is to prevent casual access

### 8.3 Consent and Ethics
- Landing screen displays consent text
- Required checkbox before proceeding
- Consent timestamp logged with session
- Recommendation: Researcher should obtain IRB approval for actual use

---

## 9. Configuration Section

### 9.1 Core Constants
```
CANVAS_SIZE = 1000          // pixels
N_REWARDS = 40              // per round
HIT_RADIUS = 8              // pixels, distance to trigger reward
SAMPLE_RATE = 30            // Hz, mouse position sampling frequency
TIME_LIMIT = 120000         // milliseconds (2 minutes per round)
N_ROUNDS = 5                // total rounds per session
```

### 9.2 Cluster Condition Parameters
```
CLUSTER_K_MIN = 2           // minimum number of clusters
CLUSTER_K_MAX = 3           // maximum number of clusters
CLUSTER_SIGMA_MIN = 80      // pixels, minimum cluster spread
CLUSTER_SIGMA_MAX = 120     // pixels, maximum cluster spread
CLUSTER_PIXELS_MIN = 300    // pixels per cluster
CLUSTER_PIXELS_MAX = 500    // pixels per cluster
CLUSTER_MIN_SEPARATION = 250 // pixels, minimum distance between cluster centers
CLUSTER_EDGE_MARGIN = 200   // pixels, minimum distance from canvas edge

REWARD_SIGMA_FACTOR = 0.8   // rewards clustered tighter than black pixels
REWARD_MIN_SPACING = 30     // pixels, minimum distance between rewards
REWARD_EDGE_MARGIN = 50     // pixels, keep rewards away from edges
```

### 9.3 Noise Condition Parameters
```
NOISE_N_PIXELS = 1200       // total black pixels
NOISE_MIN_PIXEL_SPACING = 3 // pixels, prevent clumping
NOISE_REWARD_MIN_SPACING = 30 // pixels, minimum distance between rewards
NOISE_REWARD_EDGE_MARGIN = 50 // pixels
```

### 9.4 Behavioral Thresholds
```
IDLE_VELOCITY_THRESHOLD = 5     // px/sec, below this = idle
IDLE_DURATION_THRESHOLD = 500   // ms, minimum duration to count as pause
EDGE_REGION_WIDTH = 100         // pixels from edge
GRID_SIZE = 10                  // 10×10 grid for coverage analysis (100 cells)
```

### 9.5 Audio Feedback
```
REWARD_SOUND_FREQUENCY = 800    // Hz, beep tone
REWARD_SOUND_DURATION = 200     // milliseconds
REWARD_SOUND_VOLUME = 0.3       // 0.0 to 1.0
```

### 9.6 Admin Settings
```
ADMIN_PASSCODE = "elay-guez-1334" // default passcode (set via VITE_ADMIN_PASSCODE env var)
SESSION_TIMEOUT = 3600000       // ms, 1 hour (for incomplete session detection)
EXPORT_BATCH_SIZE = 1000        // rows per CSV chunk (for large exports)
```

---

## 10. Acceptance Criteria

### 10.1 Participant Flow

**Landing Screen:**
- [ ] Consent text displays correctly
- [ ] Cannot proceed without checking consent checkbox
- [ ] Cannot proceed without entering participant_id (3-20 chars)
- [ ] Participant_id is validated (alphanumeric only)

**Condition Assignment:**
- [ ] First-time participant_id gets random condition (50/50 split)
- [ ] Returning participant_id retrieves stored condition
- [ ] Condition persists across all rounds
- [ ] Instructions screen displays with correct condition-neutral language

**Round Gameplay:**
- [ ] Canvas renders at 1000×1000 with correct black pixel distribution
- [ ] CLUSTER: 2-3 visible clusters of black pixels
- [ ] NOISE: Uniform random black pixels
- [ ] 40 hidden rewards placed correctly per condition rules
- [ ] Mouse position sampled at 30 Hz (±2 Hz tolerance)
- [ ] Reward hit detection works within 8px radius
- [ ] Audio feedback plays on reward collection (no double-plays)
- [ ] Score increments correctly
- [ ] Timer counts down accurately
- [ ] Round ends at time limit OR when all 40 rewards collected
- [ ] All movement data logged to IndexedDB

**Between Rounds:**
- [ ] Inter-round screen displays for 3 seconds
- [ ] Shows rewards collected in previous round
- [ ] Auto-advances to next round
- [ ] New black pixel and reward layout generated

**Completion Screen:**
- [ ] Displays after final round
- [ ] Shows correct summary statistics
- [ ] "Download My Data" exports valid JSON file
- [ ] JSON includes all rounds, movements, and events
- [ ] "Finish and Exit" returns to landing screen

### 10.2 Admin Flow

**Login:**
- [ ] Admin route accessible at `/admin`
- [ ] Passcode input validates against configured passcode
- [ ] Incorrect passcode shows error message
- [ ] Successful login persists for browser session
- [ ] Logout button clears session

**Dashboard:**
- [ ] Lists all sessions from IndexedDB
- [ ] Shows: session_id, participant_id, condition, date, rounds completed, total rewards
- [ ] Sorts by date (most recent first)
- [ ] Search by participant_id filters correctly
- [ ] Filter by condition (CLUSTER/NOISE/All) works
- [ ] "View Details" navigates to session detail page
- [ ] "Export CSV" downloads correct CSV files

**Session Detail:**
- [ ] Displays all per-round statistics correctly
- [ ] Statistics match logged data (validated against raw data)
- [ ] Path replay canvas renders correctly
- [ ] Black pixels, rewards, and path visible
- [ ] Timeline scrubber controls playback
- [ ] Play/pause works smoothly
- [ ] Speed controls (0.5×-10×) adjust playback
- [ ] Scrubbing updates canvas position correctly
- [ ] Reward hit markers appear on timeline at correct times
- [ ] Heatmap toggle overlays visit frequency correctly

### 10.3 Data Quality

**Mouse Tracking:**
- [ ] Samples collected at 30 Hz ±5% variance
- [ ] No gaps in data during active round
- [ ] Timestamp accuracy: ±10ms
- [ ] x, y coordinates within [0, 1000] bounds
- [ ] Velocity calculations accurate (spot-check against manual calculation)

**Event Logging:**
- [ ] round_start event at t=0
- [ ] reward_hit events at correct timestamps with correct reward_index
- [ ] round_end event at correct timestamp with correct reason
- [ ] All events include required metadata

**Data Persistence:**
- [ ] Session data survives browser refresh
- [ ] Can retrieve all sessions from IndexedDB
- [ ] Export JSON matches stored data exactly
- [ ] CSV exports contain all expected columns
- [ ] No data loss on normal completion
- [ ] Incomplete sessions saved correctly

### 10.4 Condition Validity

**CLUSTER Condition:**
- [ ] Black pixels form 2-3 visible clusters
- [ ] Cluster centers separated by ≥250px
- [ ] Cluster centers ≥200px from edges
- [ ] Rewards concentrated in same cluster regions
- [ ] Visual inspection confirms spatial structure

**NOISE Condition:**
- [ ] Black pixels appear uniformly distributed
- [ ] No obvious clustering (visual inspection)
- [ ] Rewards uniformly distributed
- [ ] Minimum spacing constraints met

**Consistency:**
- [ ] Same participant always gets same condition
- [ ] Condition recorded correctly in all data structures
- [ ] Admin dashboard correctly displays condition

### 10.5 Performance

**Responsiveness:**
- [ ] Canvas rendering: 60 FPS during gameplay
- [ ] No lag in mouse tracking
- [ ] Reward hit detection < 50ms latency
- [ ] Audio feedback < 100ms latency
- [ ] Round transitions < 500ms

**Data Handling:**
- [ ] IndexedDB writes non-blocking (no UI freeze)
- [ ] Export completes in < 5 seconds for typical session
- [ ] Admin dashboard loads < 2 seconds with 100 sessions

### 10.6 Edge Cases

**Error Handling:**
- [ ] IndexedDB unavailable: show error message, suggest localStorage fallback
- [ ] Audio unavailable: continue without audio (silent reward collection)
- [ ] Window resize: canvas scales appropriately or locks aspect ratio
- [ ] Multiple tabs: warn user to use single tab

**Boundary Conditions:**
- [ ] Mouse leaves canvas: stop tracking, resume when returns
- [ ] All 40 rewards collected early: end round immediately
- [ ] 0 rewards collected: round still records correctly
- [ ] Participant closes browser mid-round: session saves as incomplete

---

## Implementation Notes

### Technology Stack
- **Framework:** React 18+ with TypeScript
- **State Management:** React Context + useReducer (or Redux if preferred)
- **Routing:** React Router v6
- **Storage:** Dexie.js (IndexedDB wrapper) for cleaner async API
- **Audio:** Web Audio API or HTML5 Audio element
- **Exports:** File-saver library for JSON/CSV downloads
- **Testing:** Jest + React Testing Library

### File Structure Suggestion
```
src/
  components/
    Landing/
    InstructionsScreen/
    GameCanvas/
    RoundTransition/
    CompletionScreen/
    Admin/
      Login/
      Dashboard/
      SessionDetail/
      PathReplay/
  hooks/
    useMouseTracking.ts
    useIndexedDB.ts
    useRewardDetection.ts
  utils/
    conditionGenerator.ts    # cluster & noise algorithms
    dataLogger.ts            # IndexedDB operations
    statsCalculator.ts       # derived metrics
    exportUtils.ts           # JSON/CSV export
  types/
    schema.ts                # TypeScript interfaces
  config/
    constants.ts             # all config values
```

### Development Phases
1. **Phase 1:** Core gameplay (canvas, rewards, basic tracking)
2. **Phase 2:** Condition generation (cluster/noise algorithms)
3. **Phase 3:** Data logging (IndexedDB integration)
4. **Phase 4:** Participant flow (landing → rounds → completion)
5. **Phase 5:** Admin dashboard (login, list sessions)
6. **Phase 6:** Admin visualizations (stats, path replay)
7. **Phase 7:** Export functionality (JSON, CSV)
8. **Phase 8:** Testing and refinement

### Research Validity Checklist
- [ ] Sampling rate verified with performance.now() timestamps
- [ ] Condition assignment truly random (use crypto.getRandomValues)
- [ ] No visual feedback that could cue reward locations
- [ ] Hit radius consistent across all trials
- [ ] Timer accurate (compensate for drift)
- [ ] Data export includes all raw samples for independent verification

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** Ready for implementation

