// Mouse Tracking Hook - 30 Hz sampling

import { useRef, useCallback, useEffect } from 'react';
import type { MovementSample, Position } from '../types/schema';
import type { Condition } from '../config/constants';
import { SAMPLE_INTERVAL } from '../config/constants';
import { calculateVelocity, calculateDistance } from '../utils/statsCalculator';

interface UseMouseTrackingProps {
  sessionId: string;
  participantId: string;
  condition: Condition;
  roundIndex: number;
  isActive: boolean;
  roundStartTime: number;
  onSampleBatch: (samples: MovementSample[]) => void;
  batchSize?: number;
}

export function useMouseTracking({
  sessionId,
  participantId,
  condition,
  roundIndex,
  isActive,
  roundStartTime,
  onSampleBatch,
  batchSize = 100
}: UseMouseTrackingProps) {
  const currentPosition = useRef<Position | null>(null);
  const lastSampledPosition = useRef<Position | null>(null);
  const lastSampleTime = useRef<number>(0);
  const lastVelocity = useRef<number>(0);
  const sampleBuffer = useRef<MovementSample[]>([]);
  const intervalRef = useRef<number | null>(null);
  const isMouseInCanvas = useRef<boolean>(false);

  // Handle mouse move - update current position
  const handleMouseMove = useCallback((x: number, y: number) => {
    currentPosition.current = { x, y };
  }, []);

  // Handle mouse enter canvas
  const handleMouseEnter = useCallback(() => {
    isMouseInCanvas.current = true;
  }, []);

  // Handle mouse leave canvas
  const handleMouseLeave = useCallback(() => {
    isMouseInCanvas.current = false;
  }, []);

  // Sample at fixed interval
  useEffect(() => {
    if (!isActive) {
      // Clear interval when not active
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Flush remaining samples
      if (sampleBuffer.current.length > 0) {
        onSampleBatch([...sampleBuffer.current]);
        sampleBuffer.current = [];
      }
      return;
    }

    // Start sampling interval
    intervalRef.current = window.setInterval(() => {
      if (!currentPosition.current || !isMouseInCanvas.current) return;

      const now = performance.now();
      const timestampMs = now - roundStartTime;
      const timestampAbs = new Date().toISOString();

      const pos = currentPosition.current;
      const lastPos = lastSampledPosition.current;
      
      // Calculate metrics
      let distanceFromLast = 0;
      let velocity = 0;
      let acceleration = 0;

      if (lastPos && lastSampleTime.current > 0) {
        const timeDelta = now - lastSampleTime.current;
        distanceFromLast = calculateDistance(pos, lastPos);
        velocity = calculateVelocity(pos, lastPos, timeDelta);
        acceleration = velocity - lastVelocity.current;
      }

      const sample: MovementSample = {
        sessionId,
        participantId,
        condition,
        roundIndex,
        timestampMs: Math.round(timestampMs),
        timestampAbs,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        heading: 0, // Mouse tracking has no heading concept
        velocity: Math.round(velocity * 100) / 100,
        distanceFromLast: Math.round(distanceFromLast * 100) / 100,
        acceleration: Math.round(acceleration * 100) / 100,
        foodHere: false // Mouse tracking doesn't track this per sample
      };

      sampleBuffer.current.push(sample);

      // Update refs for next sample
      lastSampledPosition.current = { ...pos };
      lastSampleTime.current = now;
      lastVelocity.current = velocity;

      // Flush buffer if batch size reached
      if (sampleBuffer.current.length >= batchSize) {
        onSampleBatch([...sampleBuffer.current]);
        sampleBuffer.current = [];
      }
    }, SAMPLE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, sessionId, participantId, condition, roundIndex, roundStartTime, onSampleBatch, batchSize]);

  // Reset tracking state
  const reset = useCallback(() => {
    currentPosition.current = null;
    lastSampledPosition.current = null;
    lastSampleTime.current = 0;
    lastVelocity.current = 0;
    sampleBuffer.current = [];
    isMouseInCanvas.current = false;
  }, []);

  // Flush any remaining samples
  const flush = useCallback(() => {
    if (sampleBuffer.current.length > 0) {
      onSampleBatch([...sampleBuffer.current]);
      sampleBuffer.current = [];
    }
  }, [onSampleBatch]);

  return {
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
    reset,
    flush,
    getCurrentPosition: () => currentPosition.current
  };
}

