// Condition Generation Algorithms for CONCENTRATED and DIFFUSE conditions
// Based on NetLogo specification:
// - DIFFUSE: ~700 scattered seed points
// - CONCENTRATED: 4 dense clusters (4 seed points expanded 20 times)
// Uses seeded RNG for deterministic generation per participant+round

import type { Position, Reward, ClusterParams } from '../types/schema';
import type { Condition } from '../config/constants';
import {
  CANVAS_SIZE,
  N_REWARDS,
  CONCENTRATED_N_CLUSTERS,
  CONCENTRATED_CLUSTER_RADIUS,
  CONCENTRATED_MIN_SEPARATION,
  CONCENTRATED_EDGE_MARGIN,
  DIFFUSE_EDGE_MARGIN,
  REWARD_MIN_SPACING,
  REWARD_EDGE_MARGIN,
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

// ============ CONCENTRATED CONDITION GENERATION ============
// NetLogo spec: 4 dense patches (4 seed points expanded 20 times)

interface ConcentratedGenerationResult {
  rewards: Reward[];
  clusterParams: ClusterParams;
}

/**
 * Generate cluster centers for CONCENTRATED condition
 * Creates 4 clusters ensuring minimum separation and edge margin
 */
function generateConcentratedCenters(rng: SeededRandom): Array<{ x: number; y: number; radius: number }> {
  const centers: Array<{ x: number; y: number; radius: number }> = [];
  const maxAttempts = 1000;
  const minX = CONCENTRATED_EDGE_MARGIN + CONCENTRATED_CLUSTER_RADIUS;
  const maxX = CANVAS_SIZE - CONCENTRATED_EDGE_MARGIN - CONCENTRATED_CLUSTER_RADIUS;
  const minY = CONCENTRATED_EDGE_MARGIN + CONCENTRATED_CLUSTER_RADIUS;
  const maxY = CANVAS_SIZE - CONCENTRATED_EDGE_MARGIN - CONCENTRATED_CLUSTER_RADIUS;
  
  for (let i = 0; i < CONCENTRATED_N_CLUSTERS; i++) {
    let attempts = 0;
    let placed = false;
    
    while (attempts < maxAttempts && !placed) {
      const x = rng.nextInt(minX, maxX);
      const y = rng.nextInt(minY, maxY);
      
      const candidate = { x, y, radius: CONCENTRATED_CLUSTER_RADIUS };
      const isValid = centers.every(c => distance(candidate, c) >= CONCENTRATED_MIN_SEPARATION);
      
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
        radius: CONCENTRATED_CLUSTER_RADIUS
      });
    }
  }
  
  return centers;
}

/**
 * Generate reward positions for CONCENTRATED condition
 * Distributes rewards densely within 4 clusters
 * GUARANTEES exactly N_REWARDS rewards are generated
 */
function generateConcentratedRewards(
  rng: SeededRandom,
  centers: Array<{ x: number; y: number; radius: number }>
): Reward[] {
  const rewards: Reward[] = [];
  const maxAttemptsPerReward = 50;
  const maxTotalAttempts = N_REWARDS * maxAttemptsPerReward * 3;
  let totalAttempts = 0;
  let currentSpacing = REWARD_MIN_SPACING;
  
  // Distribute rewards among clusters
  const rewardsPerCluster = Math.floor(N_REWARDS / centers.length);
  const extraRewards = N_REWARDS % centers.length;
  
  for (let clusterIdx = 0; clusterIdx < centers.length; clusterIdx++) {
    const center = centers[clusterIdx];
    const targetCount = rewardsPerCluster + (clusterIdx < extraRewards ? 1 : 0);
    let clusterRewards = 0;
    
    while (clusterRewards < targetCount && totalAttempts < maxTotalAttempts) {
      const i = rewards.length;
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
          clusterRewards++;
        }
        attempts++;
        totalAttempts++;
      }
      
      // If we couldn't place with current spacing, reduce it
      if (!placed) {
        currentSpacing = Math.max(3, currentSpacing * 0.9);
        
        // Force place with reduced spacing
        const pos = sampleInCircle(rng, center.x, center.y, center.radius);
        const x = clamp(pos.x, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
        const y = clamp(pos.y, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN);
        
        const tooClose = rewards.some(r => distance(r, { x, y }) < 3);
        if (!tooClose) {
          rewards.push({
            id: rewards.length,
            x,
            y,
            collected: false
          });
          clusterRewards++;
        }
        totalAttempts++;
      }
    }
  }
  
  // FINAL FALLBACK: Fill remaining rewards if needed
  while (rewards.length < N_REWARDS) {
    const clusterIdx = rewards.length % centers.length;
    const center = centers[clusterIdx];
    const pos = sampleInCircle(rng, center.x, center.y, center.radius);
    
    rewards.push({
      id: rewards.length,
      x: clamp(pos.x, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN),
      y: clamp(pos.y, REWARD_EDGE_MARGIN, CANVAS_SIZE - REWARD_EDGE_MARGIN),
      collected: false
    });
  }
  
  if (rewards.length !== N_REWARDS) {
    console.error(`[CRITICAL] Concentrated generator produced ${rewards.length} rewards, expected ${N_REWARDS}`);
  }
  
  return rewards;
}

/**
 * Generate complete CONCENTRATED condition layout (seeded)
 */
function generateConcentratedCondition(rng: SeededRandom): ConcentratedGenerationResult {
  const centers = generateConcentratedCenters(rng);
  const rewards = generateConcentratedRewards(rng, centers);
  
  return {
    rewards,
    clusterParams: { k: CONCENTRATED_N_CLUSTERS, centers }
  };
}

// ============ DIFFUSE CONDITION GENERATION ============
// NetLogo spec: ~700 seed points scattered randomly

interface DiffuseGenerationResult {
  rewards: Reward[];
}

/**
 * Generate reward positions for DIFFUSE condition (scattered distribution)
 * GUARANTEES exactly N_REWARDS rewards are generated
 */
function generateDiffuseRewards(rng: SeededRandom): Reward[] {
  const rewards: Reward[] = [];
  const maxAttemptsPerReward = 50;
  const maxTotalAttempts = N_REWARDS * maxAttemptsPerReward * 3;
  let totalAttempts = 0;
  const margin = DIFFUSE_EDGE_MARGIN;
  let currentSpacing = REWARD_MIN_SPACING;
  
  // Generate scattered rewards across the entire canvas
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
    
    // If we couldn't place with current spacing, reduce it
    if (!placed) {
      currentSpacing = Math.max(3, currentSpacing * 0.9);
      
      const x = rng.nextInt(margin, CANVAS_SIZE - margin);
      const y = rng.nextInt(margin, CANVAS_SIZE - margin);
      
      const tooClose = rewards.some(r => distance(r, { x, y }) < 3);
      if (!tooClose) {
        rewards.push({
          id: rewards.length,
          x,
          y,
          collected: false
        });
      }
      totalAttempts++;
    }
  }
  
  // FINAL FALLBACK: Force place remaining rewards
  while (rewards.length < N_REWARDS) {
    rewards.push({
      id: rewards.length,
      x: rng.nextInt(margin, CANVAS_SIZE - margin),
      y: rng.nextInt(margin, CANVAS_SIZE - margin),
      collected: false
    });
  }
  
  if (rewards.length !== N_REWARDS) {
    console.error(`[CRITICAL] Diffuse generator produced ${rewards.length} rewards, expected ${N_REWARDS}`);
  }
  
  return rewards;
}

/**
 * Generate complete DIFFUSE condition layout (seeded)
 */
function generateDiffuseCondition(rng: SeededRandom): DiffuseGenerationResult {
  const rewards = generateDiffuseRewards(rng);
  return { rewards };
}

// ============ MAIN GENERATOR ============

export interface RoundLayout {
  rewards: Reward[];
  clusterParams?: ClusterParams;
}

/**
 * Generate round layout based on condition with seeded RNG
 * @param condition - CONCENTRATED or DIFFUSE
 * @param seed - seed string (e.g., participantKey + roundIndex)
 */
export function generateRoundLayout(condition: Condition, seed: string): RoundLayout {
  const rng = new SeededRandom(seed);
  
  if (condition === 'CONCENTRATED') {
    return generateConcentratedCondition(rng);
  } else {
    return generateDiffuseCondition(rng);
  }
}

/**
 * Assign condition randomly (50/50)
 */
export function assignCondition(): Condition {
  // Use crypto for true randomness
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomValue = array[0] / (0xFFFFFFFF + 1);
  return randomValue < 0.5 ? 'CONCENTRATED' : 'DIFFUSE';
}
