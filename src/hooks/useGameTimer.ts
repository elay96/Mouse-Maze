// Game Timer Hook

import { useState, useRef, useCallback, useEffect } from 'react';
import { TIME_LIMIT } from '../config/constants';

interface UseGameTimerProps {
  timeLimit?: number;
  onTimeUp: () => void;
}

export function useGameTimer({ timeLimit = TIME_LIMIT, onTimeUp }: UseGameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  // Update timer display
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeRemaining(Math.round(remaining));

      if (remaining <= 0) {
        setIsRunning(false);
        onTimeUp();
      }
    }, 100); // Update every 100ms for smooth display

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLimit, onTimeUp]);

  // Start timer
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    setTimeRemaining(timeLimit);
    setIsRunning(true);
    return startTimeRef.current;
  }, [timeLimit]);

  // Stop timer
  const stop = useCallback(() => {
    setIsRunning(false);
    const elapsed = performance.now() - startTimeRef.current;
    return Math.round(elapsed);
  }, []);

  // Reset timer
  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(timeLimit);
    startTimeRef.current = 0;
  }, [timeLimit]);

  // Get elapsed time
  const getElapsed = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return Math.round(performance.now() - startTimeRef.current);
  }, []);

  // Format time for display (MM:SS)
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining,
    isRunning,
    start,
    stop,
    reset,
    getElapsed,
    formatTime,
    formattedTime: formatTime(timeRemaining),
    startTime: startTimeRef.current
  };
}

