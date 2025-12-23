// Condition Generation Algorithms for CLUSTER and NOISE conditions
// Uses seeded RNG for deterministic generation per participant+round

import type { Position, Reward, ClusterParams } from '../types/schema';
import type { Condition } from '../config/constants';
import {
  CANVAS_SIZE,
  N_REWARDS,
  CLUSTER_K_MIN,
  CLUSTER_K_MAX,
  CLUSTER_RADIUS,
  CLUSTER_MIN_SEPARATION,
  CLUSTER_EDGE_MARGIN,
  REWARD_MIN_SPACING,
  REWARD_EDGE_MARGIN,
  NOISE_REWARD_EDGE_MARGIN,
} from '../config/constants';
import { SeededRandom } from './hash';

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate Euclidean distance between two points
 */
function distance(p1: Position, p2: Position): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a position respects minimum spacing from all existing positions
 */
function respectsSpacing(pos: Position, existing: Position[], minSpacing: number): boolean {
  return existing.every(p => distance(pos, p) >= minSpacing);
}

/**
 * Sample a point uniformly within a circle
 */
function sampleInCircle(rng: SeededRandom, centerX: number, centerY: number, radius: number): Position {
  // Use rejection sampling for uniform distribution in circle
  let x: number, y: number;
  do {
    x = rng.nextFloat(-radius, radius);
    y = rng.nextFloat(-radius, radius);
  } while (x * x + y * y > radius * radius);
  
  return {
    x: Math.round(centerX + x),
    y: Math.round(centerY + y)
  };
}

// ============ CLUSTER CONDITION GENERATION ============

interface ClusterGenerationResult {
  rewards: Reward[];
  clusterParams: ClusterParams;
}

/**
 * Generate cluster centers ensuring minimum separation and edge margin
 */
function generateClusterCenters(rng: SeededRandom, k: number): Array<{ x: number; y: number; radius: number }> {
  const centers: Array<{ x: number; y: number; radius: number }> = [];
  const maxAttempts = 1000;
  const minX = CLUSTER_EDGE_MARGIN + CLUSTER_RADIUS;
  const maxX = CANVAS_SIZE - CLUSTER_EDGE_MARGIN - CLUSTER_RADIUS;
  const minY = CLUSTER_EDGE_MARGIN + CLUSTER_RADIUS;
  const maxY = CANVAS_SIZE - CLUSTER_EDGE_MARGIN - CLUSTER_RADIUS;
  
  for (let i = 0; i < k; i++) {
    let attempts = 0;
    let placed = false;
    
    while (attempts < maxAttempts && !placed) {
      const x = rng.nextInt(minX, maxX);
      const y = rng.nextInt(minY, maxY);
      
      const candidate = { x, y, radius: CLUSTER_RADIUS };
      const isValid = centers.every(c => distance(candidate, c) >= CLUSTER_MIN_SEPARATION);
      
      if (isValid) {
        centers.push(candidate);
        placed = true;
      }
      attempts++;
    }
    
    // Fallback: place anyway if we can't find valid spot
    if (!placed) {
      centers.push({
        x: rng.nextInt(minX, maxX),
        y: rng.nextInt(minY, maxY),
        radius: CLUSTER_RADIUS
      });
    }
  }
  
  return centers;
}

/**
 * Generate reward positions for CLUSTER condition (uniformly within circular clusters)
 * GUARANTEES exactly N_REWARDS rewards are generated
 */
function generateClusterRewards(
  rng: SeededRandom,
  centers: Array<{ x: number; y: number; radius: number }>
): Reward[] {
  const rewards: Reward[] = [];
  const maxAttemptsPerReward = 100;
  const maxTotalAttempts = N_REWARDS * maxAttemptsPerReward * 2;
  let totalAttempts = 0;
  let currentSpacing = REWARD_MIN_SPACING;
  
  // Keep trying until we have exactly N_REWARDS
  while (rewards.length < N_REWARDS && totalAttempts < maxTotalAttempts) {
    const i = rewards.length;
    // Pick a cluster (round-robin distribution)
    const clusterIndex = i % centers.length;
    const center = centers[clusterIndex];
    
    let attempts = 0;
    let placed = false;
    
    while (attempts < maxAttemptsPerReward && !placed) {
      const pos = sampleInCircle(rng, center.x, center.y, center.radius);
      
      // Ensure within canvas bounds with margin
      const clampedX = clamp(pos.x, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
      const clampedY = clamp(pos.y, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
      const candidate = { x: clampedX, y: clampedY };
      
      if (respectsSpacing(candidate, rewards, currentSpacing)) {
        rewards.push({
          id: i,
          x: candidate.x,
          y: candidate.y,
          collected: false
        });
        placed = true;
      }
      attempts++;
      totalAttempts++;
    }
    
    // If we couldn't place with current spacing, try with reduced spacing
    if (!placed) {
      // Reduce spacing requirement and try again
      currentSpacing = Math.max(5, currentSpacing * 0.8);
      
      // Try one more time with reduced spacing
      const pos = sampleInCircle(rng, center.x, center.y, center.radius);
      const x = clamp(pos.x, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
      const y = clamp(pos.y, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
      
      // Only check against very close rewards (10px)
      const tooClose = rewards.some(r => distance(r, { x, y }) < 10);
      if (!tooClose) {
        rewards.push({
          id: i,
          x,
          y,
          collected: false
        });
      }
      totalAttempts++;
    }
  }
  
  // FINAL FALLBACK: If still not enough, force place remaining rewards
  while (rewards.length < N_REWARDS) {
    const i = rewards.length;
    const clusterIndex = i % centers.length;
    const center = centers[clusterIndex];
    const pos = sampleInCircle(rng, center.x, center.y, center.radius);
    
    rewards.push({
      id: i,
      x: clamp(pos.x, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN),
      y: clamp(pos.y, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN),
      collected: false
    });
  }
  
  // ASSERTION: Must have exactly N_REWARDS
  if (rewards.length !== N_REWARDS) {
    console.error(`[CRITICAL] Cluster generator produced ${rewards.length} rewards, expected ${N_REWARDS}`);
  }
  
  return rewards;
}

/**
 * Generate complete CLUSTER condition layout (seeded)
 */
function generateClusterCondition(rng: SeededRandom): ClusterGenerationResult {
  // K is deterministic based on seed
  const k = rng.nextInt(CLUSTER_K_MIN, CLUSTER_K_MAX);
  const centers = generateClusterCenters(rng, k);
  const rewards = generateClusterRewards(rng, centers);
  
  return {
    rewards,
    clusterParams: { k, centers }
  };
}

// ============ NOISE CONDITION GENERATION ============

interface NoiseGenerationResult {
  rewards: Reward[];
}

/**
 * Generate reward positions for NOISE condition (uniform distribution)
 * GUARANTEES exactly N_REWARDS rewards are generated
 */
function generateNoiseRewards(rng: SeededRandom): Reward[] {
  const rewards: Reward[] = [];
  const maxAttemptsPerReward = 100;
  const maxTotalAttempts = N_REWARDS * maxAttemptsPerReward * 2;
  let totalAttempts = 0;
  const margin = NOISE_REWARD_EDGE_MARGIN;
  let currentSpacing = REWARD_MIN_SPACING;
  
  // Keep trying until we have exactly N_REWARDS
  while (rewards.length < N_REWARDS && totalAttempts < maxTotalAttempts) {
    const i = rewards.length;
    let attempts = 0;
    let placed = false;
    
    while (attempts < maxAttemptsPerReward && !placed) {
      const x = rng.nextInt(margin, CANVAS_SIZE - margin);
      const y = rng.nextInt(margin, CANVAS_SIZE - margin);
      const candidate = { x, y };
      
      if (respectsSpacing(candidate, rewards, currentSpacing)) {
        rewards.push({
          id: i,
          x,
          y,
          collected: false
        });
        placed = true;
      }
      attempts++;
      totalAttempts++;
    }
    
    // If we couldn't place with current spacing, try with reduced spacing
    if (!placed) {
      // Reduce spacing requirement
      currentSpacing = Math.max(5, currentSpacing * 0.8);
      
      const x = rng.nextInt(margin, CANVAS_SIZE - margin);
      const y = rng.nextInt(margin, CANVAS_SIZE - margin);
      
      // Only check against very close rewards (10px)
      const tooClose = rewards.some(r => distance(r, { x, y }) < 10);
      if (!tooClose) {
        rewards.push({
          id: i,
          x,
          y,
          collected: false
        });
      }
      totalAttempts++;
    }
  }
  
  // FINAL FALLBACK: If still not enough, force place remaining rewards
  while (rewards.length < N_REWARDS) {
    const i = rewards.length;
    rewards.push({
      id: i,
      x: rng.nextInt(margin, CANVAS_SIZE - margin),
      y: rng.nextInt(margin, CANVAS_SIZE - margin),
      collected: false
    });
  }
  
  // ASSERTION: Must have exactly N_REWARDS
  if (rewards.length !== N_REWARDS) {
    console.error(`[CRITICAL] Noise generator produced ${rewards.length} rewards, expected ${N_REWARDS}`);
  }
  
  return rewards;
}

/**
 * Generate complete NOISE condition layout (seeded)
 */
function generateNoiseCondition(rng: SeededRandom): NoiseGenerationResult {
  const rewards = generateNoiseRewards(rng);
  return { rewards };
}

// ============ MAIN GENERATOR ============

export interface RoundLayout {
  rewards: Reward[];
  clusterParams?: ClusterParams;
}

/**
 * Generate round layout based on condition with seeded RNG
 * @param condition - CLUSTER or NOISE
 * @param seed - seed string (e.g., participantKey + roundIndex)
 */
export function generateRoundLayout(condition: Condition, seed: string): RoundLayout {
  const rng = new SeededRandom(seed);
  
  if (condition === 'CLUSTER') {
    return generateClusterCondition(rng);
  } else {
    return generateNoiseCondition(rng);
  }
}

/**
 * Assign condition randomly (50/50)
 */
export function assignCondition(): Condition {
  // Use crypto for true randomness
  // Generate a random number and use it to make a true 50/50 decision
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Convert to 0-1 range and use threshold for true 50/50 split
  const randomValue = array[0] / (0xFFFFFFFF + 1); // Normalize to [0, 1)
  return randomValue < 0.5 ? 'CLUSTER' : 'NOISE';
}
