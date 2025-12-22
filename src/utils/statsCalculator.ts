// Statistics Calculator for Mouse Maze

import type { MovementSample, GameEvent, RoundStats, Position } from '../types/schema';
import {
  CANVAS_SIZE,
  GRID_SIZE,
  IDLE_VELOCITY_THRESHOLD,
  IDLE_DURATION_THRESHOLD,
  EDGE_REGION_WIDTH
} from '../config/constants';

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Position, p2: Position): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Calculate statistics for a single round
 */
export function calculateRoundStats(
  sessionId: string,
  roundIndex: number,
  movements: MovementSample[],
  events: GameEvent[],
  durationMs: number,
  rewardsCollected: number
): RoundStats {
  if (movements.length === 0) {
    return createEmptyStats(sessionId, roundIndex, durationMs, rewardsCollected);
  }

  // Sort movements by timestamp
  const sortedMovements = [...movements].sort((a, b) => a.timestampMs - b.timestampMs);
  
  // Basic metrics
  const totalDistance = calculateTotalDistance(sortedMovements);
  const velocities = sortedMovements.map(m => m.velocity);
  const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const maxVelocity = Math.max(...velocities);
  
  // Path efficiency
  const pathEfficiency = calculatePathEfficiency(sortedMovements, totalDistance);
  
  // Coverage analysis
  const { coveragePercent, revisitRate } = calculateCoverage(sortedMovements);
  
  // Pause analysis
  const pauseMetrics = calculatePauseMetrics(sortedMovements);
  
  // Reward timing
  const rewardEvents = events.filter(e => e.eventType === 'reward_hit');
  const rewardTimings = calculateRewardTimings(rewardEvents);
  
  // Spatial bias
  const spatialBias = calculateSpatialBias(sortedMovements);
  
  return {
    sessionId,
    roundIndex,
    timeToFinish: durationMs,
    rewardsCollected,
    completionRate: (rewardsCollected / 40) * 100,
    totalDistance,
    meanVelocity,
    maxVelocity,
    pathEfficiency,
    coveragePercent,
    revisitRate,
    ...pauseMetrics,
    ...rewardTimings,
    ...spatialBias
  };
}

/**
 * Create empty stats for rounds with no movement data
 */
function createEmptyStats(
  sessionId: string,
  roundIndex: number,
  durationMs: number,
  rewardsCollected: number
): RoundStats {
  return {
    sessionId,
    roundIndex,
    timeToFinish: durationMs,
    rewardsCollected,
    completionRate: (rewardsCollected / 40) * 100,
    totalDistance: 0,
    meanVelocity: 0,
    maxVelocity: 0,
    pathEfficiency: 0,
    coveragePercent: 0,
    revisitRate: 0,
    pausesCount: 0,
    totalIdleTime: 0,
    meanPauseDuration: 0,
    firstRewardLatency: durationMs,
    meanInterRewardInterval: 0,
    edgeTimePercent: 0,
    centerBias: 0,
    quadrantDistribution: { NW: 25, NE: 25, SW: 25, SE: 25 }
  };
}

/**
 * Calculate total path distance
 */
function calculateTotalDistance(movements: MovementSample[]): number {
  return movements.reduce((total, m) => total + m.distanceFromLast, 0);
}

/**
 * Calculate path efficiency (straight line vs actual distance)
 */
function calculatePathEfficiency(movements: MovementSample[], totalDistance: number): number {
  if (movements.length < 2 || totalDistance === 0) return 0;
  
  const first = movements[0];
  const last = movements[movements.length - 1];
  const straightLineDistance = distance(first, last);
  
  return straightLineDistance / totalDistance;
}

/**
 * Calculate grid-based coverage
 */
function calculateCoverage(movements: MovementSample[]): { coveragePercent: number; revisitRate: number } {
  const cellSize = CANVAS_SIZE / GRID_SIZE;
  const visitCounts = new Map<string, number>();
  
  for (const m of movements) {
    const cellX = Math.floor(m.x / cellSize);
    const cellY = Math.floor(m.y / cellSize);
    const key = `${cellX},${cellY}`;
    visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
  }
  
  const totalCells = GRID_SIZE * GRID_SIZE;
  const visitedCells = visitCounts.size;
  const coveragePercent = (visitedCells / totalCells) * 100;
  
  const totalVisits = Array.from(visitCounts.values()).reduce((a, b) => a + b, 0);
  const revisitRate = visitedCells > 0 ? totalVisits / visitedCells : 0;
  
  return { coveragePercent, revisitRate };
}

/**
 * Calculate pause/idle metrics
 */
function calculatePauseMetrics(movements: MovementSample[]): {
  pausesCount: number;
  totalIdleTime: number;
  meanPauseDuration: number;
} {
  let pausesCount = 0;
  let totalIdleTime = 0;
  let currentPauseStart: number | null = null;
  let consecutiveIdleSamples = 0;
  
  for (let i = 0; i < movements.length; i++) {
    const isIdle = movements[i].velocity < IDLE_VELOCITY_THRESHOLD;
    
    if (isIdle) {
      consecutiveIdleSamples++;
      if (currentPauseStart === null) {
        currentPauseStart = movements[i].timestampMs;
      }
    } else {
      if (currentPauseStart !== null) {
        const pauseDuration = movements[i].timestampMs - currentPauseStart;
        if (pauseDuration >= IDLE_DURATION_THRESHOLD) {
          pausesCount++;
          totalIdleTime += pauseDuration;
        }
        currentPauseStart = null;
        consecutiveIdleSamples = 0;
      }
    }
  }
  
  // Check if round ended during a pause
  if (currentPauseStart !== null && movements.length > 0) {
    const pauseDuration = movements[movements.length - 1].timestampMs - currentPauseStart;
    if (pauseDuration >= IDLE_DURATION_THRESHOLD) {
      pausesCount++;
      totalIdleTime += pauseDuration;
    }
  }
  
  const meanPauseDuration = pausesCount > 0 ? totalIdleTime / pausesCount : 0;
  
  return { pausesCount, totalIdleTime, meanPauseDuration };
}

/**
 * Calculate reward timing metrics
 */
function calculateRewardTimings(rewardEvents: GameEvent[]): {
  firstRewardLatency: number;
  meanInterRewardInterval: number;
} {
  if (rewardEvents.length === 0) {
    return { firstRewardLatency: 0, meanInterRewardInterval: 0 };
  }
  
  const sortedEvents = [...rewardEvents].sort((a, b) => a.timestampMs - b.timestampMs);
  const firstRewardLatency = sortedEvents[0].timestampMs;
  
  let totalInterval = 0;
  for (let i = 1; i < sortedEvents.length; i++) {
    totalInterval += sortedEvents[i].timestampMs - sortedEvents[i - 1].timestampMs;
  }
  
  const meanInterRewardInterval = sortedEvents.length > 1 
    ? totalInterval / (sortedEvents.length - 1) 
    : 0;
  
  return { firstRewardLatency, meanInterRewardInterval };
}

/**
 * Calculate spatial bias metrics
 */
function calculateSpatialBias(movements: MovementSample[]): {
  edgeTimePercent: number;
  centerBias: number;
  quadrantDistribution: { NW: number; NE: number; SW: number; SE: number };
} {
  if (movements.length === 0) {
    return {
      edgeTimePercent: 0,
      centerBias: 0,
      quadrantDistribution: { NW: 25, NE: 25, SW: 25, SE: 25 }
    };
  }
  
  let edgeSamples = 0;
  let centerSamples = 0;
  const quadrants = { NW: 0, NE: 0, SW: 0, SE: 0 };
  const centerMin = (CANVAS_SIZE - 400) / 2; // 300
  const centerMax = (CANVAS_SIZE + 400) / 2; // 700
  const midpoint = CANVAS_SIZE / 2;
  
  for (const m of movements) {
    // Edge detection
    const isEdge = 
      m.x < EDGE_REGION_WIDTH || 
      m.x > CANVAS_SIZE - EDGE_REGION_WIDTH ||
      m.y < EDGE_REGION_WIDTH || 
      m.y > CANVAS_SIZE - EDGE_REGION_WIDTH;
    
    if (isEdge) edgeSamples++;
    
    // Center detection (400x400 center region)
    const isCenter = 
      m.x >= centerMin && m.x <= centerMax &&
      m.y >= centerMin && m.y <= centerMax;
    
    if (isCenter) centerSamples++;
    
    // Quadrant detection
    if (m.x < midpoint && m.y < midpoint) quadrants.NW++;
    else if (m.x >= midpoint && m.y < midpoint) quadrants.NE++;
    else if (m.x < midpoint && m.y >= midpoint) quadrants.SW++;
    else quadrants.SE++;
  }
  
  const total = movements.length;
  const edgeTimePercent = (edgeSamples / total) * 100;
  const nonEdgeSamples = total - edgeSamples;
  const centerBias = nonEdgeSamples > 0 ? centerSamples / nonEdgeSamples : 0;
  
  const quadrantDistribution = {
    NW: (quadrants.NW / total) * 100,
    NE: (quadrants.NE / total) * 100,
    SW: (quadrants.SW / total) * 100,
    SE: (quadrants.SE / total) * 100
  };
  
  return { edgeTimePercent, centerBias, quadrantDistribution };
}

/**
 * Calculate velocity from two consecutive samples
 */
export function calculateVelocity(
  current: Position,
  previous: Position,
  timeDeltaMs: number
): number {
  if (timeDeltaMs === 0) return 0;
  const dist = distance(current, previous);
  return (dist / timeDeltaMs) * 1000; // px/sec
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(p1: Position, p2: Position): number {
  return distance(p1, p2);
}

