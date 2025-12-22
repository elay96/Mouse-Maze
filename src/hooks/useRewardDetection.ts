// Reward Detection Hook - Real-time hit detection with idempotent tracking

import { useCallback, useRef } from 'react';
import type { Reward, Position, GameEvent } from '../types/schema';
import { HIT_RADIUS, N_REWARDS } from '../config/constants';
import { playRewardChime } from '../utils/audioFeedback';

interface UseRewardDetectionProps {
  rewardsRef: React.MutableRefObject<Reward[]>; // Use ref for real-time access
  sessionId: string;
  roundIndex: number;
  roundStartTimeRef: React.MutableRefObject<number>; // Use ref for real-time access
  onRewardCollected: (reward: Reward, event: GameEvent, newCount: number) => void;
  onAllRewardsCollected: () => void;
  hitRadius?: number;
}

export function useRewardDetection({
  rewardsRef,
  sessionId,
  roundIndex,
  roundStartTimeRef,
  onRewardCollected,
  onAllRewardsCollected,
  hitRadius = HIT_RADIUS
}: UseRewardDetectionProps) {
  // AUTHORITATIVE collected rewards set - source of truth for score
  const collectedIds = useRef<Set<number>>(new Set());

  // Check if mouse position is within hit radius of any uncollected reward
  // This is called on EVERY mousemove event for real-time detection
  const checkPosition = useCallback((position: Position) => {
    const rewards = rewardsRef.current;
    const roundStartTime = roundStartTimeRef.current;
    
    // Early exit if no rewards or round not started
    if (!rewards.length || roundStartTime === 0) return;
    
    const now = performance.now();
    const timestampMs = Math.round(now - roundStartTime);
    const timestampAbs = new Date().toISOString();

    for (const reward of rewards) {
      // IDEMPOTENT: Skip if already collected (check ref, not state)
      if (collectedIds.current.has(reward.id)) {
        continue;
      }

      // Check distance using squared distance for performance
      const dx = position.x - reward.x;
      const dy = position.y - reward.y;
      const distanceSquared = dx * dx + dy * dy;
      const hitRadiusSquared = hitRadius * hitRadius;

      if (distanceSquared <= hitRadiusSquared) {
        // IDEMPOTENT: Mark as collected in ref FIRST (before any async)
        collectedIds.current.add(reward.id);
        const newCount = collectedIds.current.size;
        
        // Play sound immediately
        playRewardChime();

        // Create event with authoritative count
        const event: GameEvent = {
          sessionId,
          roundIndex,
          eventType: 'reward_hit',
          timestampMs,
          timestampAbs,
          metadata: {
            rewardIndex: reward.id,
            rewardPosition: { x: reward.x, y: reward.y },
            totalRewardsCollected: newCount
          }
        };

        // Callback with authoritative new count
        onRewardCollected(
          { ...reward, collected: true, timestampCollected: timestampAbs },
          event,
          newCount
        );

        // Check if ALL rewards collected using authoritative count
        if (newCount >= N_REWARDS) {
          onAllRewardsCollected();
          return; // Stop checking
        }
      }
    }
  }, [rewardsRef, sessionId, roundIndex, roundStartTimeRef, hitRadius, onRewardCollected, onAllRewardsCollected]);

  // Reset for new round
  const reset = useCallback(() => {
    collectedIds.current.clear();
  }, []);

  // Get authoritative count of collected rewards
  const getCollectedCount = useCallback(() => {
    return collectedIds.current.size;
  }, []);

  return {
    checkPosition,
    reset,
    getCollectedCount,
    collectedIds // Expose for direct access if needed
  };
}

