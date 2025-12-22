// Game Canvas Component - Main gameplay area

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Reward, MovementSample, GameEvent, Round } from '../../types/schema';
import type { Condition } from '../../config/constants';
import { CANVAS_SIZE, CANVAS_BACKGROUND, N_REWARDS, REWARD_REVEAL_DURATION, REWARD_DOT_SIZE, INTER_ROUND_DELAY } from '../../config/constants';
import { useMouseTracking } from '../../hooks/useMouseTracking';
import { useRewardDetection } from '../../hooks/useRewardDetection';
import { useGameTimer } from '../../hooks/useGameTimer';
import { generateRoundLayout } from '../../utils/conditionGenerator';
import { saveMovementBatch, saveEvent, saveRound } from '../../utils/database';
import { initAudio } from '../../utils/audioFeedback';
import styles from './GameCanvas.module.css';

interface GameCanvasProps {
  sessionId: string;
  participantId: string; // participantKey
  condition: Condition;
  roundIndex: number;
  onRoundComplete: (round: Round) => void;
}

// Track revealed rewards for visual effect
interface RevealedReward {
  reward: Reward;
  expireAt: number;
}

// Countdown durations in seconds
const END_COUNTDOWN_SECONDS = Math.ceil(INTER_ROUND_DELAY / 1000);
const START_COUNTDOWN_SECONDS = 5; // 5-second countdown before round starts

export function GameCanvas({
  sessionId,
  participantId,
  condition,
  roundIndex,
  onRoundComplete
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState(0); // Display score - derived from authoritative ref
  const [layout, setLayout] = useState<{
    rewards: Reward[];
    clusterParams?: { k: number; centers: Array<{ x: number; y: number; radius: number }> };
  } | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [revealedRewards, setRevealedRewards] = useState<RevealedReward[]>([]);
  const [isRoundEnded, setIsRoundEnded] = useState(false);
  const [pendingRound, setPendingRound] = useState<Round | null>(null);
  const [endCountdown, setEndCountdown] = useState(END_COUNTDOWN_SECONDS);
  const [startCountdown, setStartCountdown] = useState<number | null>(null); // null = not counting, number = counting down
  const roundStartTimeRef = useRef<number>(0);
  const eventsRef = useRef<GameEvent[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isEndingRef = useRef<boolean>(false); // Idempotent guard
  const isStartingRef = useRef<boolean>(false); // Guard for start countdown
  const rewardsRef = useRef<Reward[]>([]); // Real-time rewards access for hit detection
  const layoutRef = useRef<typeof layout>(null); // Real-time layout access

  // Timer hook - defined early so stopTimer is available
  // Note: getCollectedCount is defined later but handleRoundEnd uses it via closure
  const { start: startTimer, stop: stopTimer, formattedTime } = useGameTimer({
    onTimeUp: () => handleRoundEnd('timeout')
  });
  
  // Placeholder for getCollectedCount - will be set by useRewardDetection
  // Using a ref to avoid circular dependency
  const getCollectedCountRef = useRef<() => number>(() => 0);

  // Handle round completion with idempotent guard
  // Uses refs for authoritative data to avoid stale closure issues
  const handleRoundEnd = useCallback((reason: 'all_rewards' | 'timeout', finalScore?: number) => {
    // Idempotent guard: prevent multiple calls
    if (isEndingRef.current || !layoutRef.current) return;
    isEndingRef.current = true;

    // IMMEDIATELY stop timer to prevent further callbacks
    stopTimer();

    // Mark round as ended to freeze canvas and stop tracking
    setIsRoundEnded(true);
    setEndCountdown(END_COUNTDOWN_SECONDS);

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const endTimestamp = new Date().toISOString();
    const durationMs = performance.now() - roundStartTimeRef.current;
    
    // Use authoritative score from ref (passed in or from getCollectedCount ref)
    const authoritativeScore = finalScore ?? getCollectedCountRef.current();
    
    // Update display score to match authoritative
    setScore(authoritativeScore);

    // Create round end event
    const endEvent: GameEvent = {
      sessionId,
      roundIndex,
      eventType: reason === 'timeout' ? 'timeout' : 'round_end',
      timestampMs: Math.round(durationMs),
      timestampAbs: endTimestamp,
      metadata: {
        totalRewardsCollected: authoritativeScore,
        reason
      }
    };

    // Save data asynchronously (don't block UI)
    saveEvent(endEvent).catch(console.error);
    eventsRef.current.push(endEvent);

    // Save round data using refs for current values
    const round: Round = {
      sessionId,
      roundIndex,
      condition,
      startTimestamp: new Date(roundStartTimeRef.current).toISOString(),
      endTimestamp,
      durationMs: Math.round(durationMs),
      rewardsCollected: authoritativeScore,
      blackPixelPositions: [], // No black pixels in new design
      rewardPositions: rewardsRef.current,
      clusterParams: layoutRef.current.clusterParams,
      endReason: reason
    };

    // Save round asynchronously (don't block UI)
    saveRound(round).catch(console.error);

    // Set pending round for countdown
    setPendingRound(round);
  }, [sessionId, roundIndex, condition, stopTimer]);

  // End countdown timer effect - runs when round ends
  useEffect(() => {
    if (!isRoundEnded || !pendingRound) return;

    // Countdown interval - updates once per second
    const countdownInterval = setInterval(() => {
      setEndCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(countdownInterval);
          // Transition to next round
          setIsRoundEnded(false);
          isEndingRef.current = false;
          onRoundComplete(pendingRound);
          setPendingRound(null);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isRoundEnded, pendingRound, onRoundComplete]);

  // Start countdown timer effect - runs before round begins
  useEffect(() => {
    if (startCountdown === null) return;

    if (startCountdown <= 0) {
      // Countdown finished, start the round
      isStartingRef.current = false;
      setStartCountdown(null);
      
      // Actually start the round
      roundStartTimeRef.current = performance.now();
      setIsStarted(true);
      startTimer();

      // Log round start event
      const startEvent: GameEvent = {
        sessionId,
        roundIndex,
        eventType: 'round_start',
        timestampMs: 0,
        timestampAbs: new Date().toISOString()
      };
      saveEvent(startEvent).catch(console.error);
      eventsRef.current.push(startEvent);
      return;
    }

    // Countdown tick
    const timer = setTimeout(() => {
      setStartCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [startCountdown, sessionId, roundIndex, startTimer]);

  // Handle reward collection with reveal effect
  // newCount is the AUTHORITATIVE count from the detection hook
  const handleRewardCollected = useCallback((reward: Reward, event: GameEvent, newCount: number) => {
    // Save event asynchronously (don't block)
    saveEvent(event).catch(console.error);
    eventsRef.current.push(event);

    // Add to revealed rewards for visual effect
    const now = performance.now();
    setRevealedRewards(prev => [
      ...prev,
      { reward, expireAt: now + REWARD_REVEAL_DURATION }
    ]);

    // Update rewards state to mark as collected (for visual rendering)
    setRewards(prev => {
      const updated = prev.map(r => 
        r.id === reward.id ? { ...r, collected: true, timestampCollected: reward.timestampCollected } : r
      );
      // Also update ref for real-time access
      rewardsRef.current = updated;
      return updated;
    });

    // Update display score from authoritative count
    setScore(newCount);
  }, []);

  // Handle all rewards collected - called by detection hook
  const handleAllRewardsCollected = useCallback(() => {
    stopTimer();
    handleRoundEnd('all_rewards', N_REWARDS);
  }, [stopTimer, handleRoundEnd]);

  // Reward detection hook - uses refs for real-time access
  const { checkPosition, reset: resetRewardDetection, getCollectedCount } = useRewardDetection({
    rewardsRef,
    sessionId,
    roundIndex,
    roundStartTimeRef,
    onRewardCollected: handleRewardCollected,
    onAllRewardsCollected: handleAllRewardsCollected
  });
  
  // Update ref for handleRoundEnd to access
  getCollectedCountRef.current = getCollectedCount;

  // Handle sample batch save
  const handleSampleBatch = useCallback(async (samples: MovementSample[]) => {
    await saveMovementBatch(samples);
  }, []);

  // Mouse tracking hook - stops when round ends
  const { 
    handleMouseMove, 
    handleMouseEnter, 
    handleMouseLeave, 
    reset: resetTracking,
  } = useMouseTracking({
    sessionId,
    participantId,
    condition,
    roundIndex,
    isActive: isStarted && !isRoundEnded,
    roundStartTime: roundStartTimeRef.current,
    onSampleBatch: handleSampleBatch
  });

  // Initialize round with seeded layout
  useEffect(() => {
    // Reset guards
    isEndingRef.current = false;
    isStartingRef.current = false;
    roundStartTimeRef.current = 0;
    
    // Seed based on participantKey + roundIndex for determinism
    const seed = `${participantId}|${roundIndex}`;
    const newLayout = generateRoundLayout(condition, seed);
    
    // RUNTIME ASSERTION: Ensure exactly N_REWARDS rewards
    if (newLayout.rewards.length !== N_REWARDS) {
      console.error(`[CRITICAL] Generated ${newLayout.rewards.length} rewards instead of ${N_REWARDS}. Regenerating...`);
      // This should never happen, but if it does, the generator has a bug
    }
    
    // Update both state and refs for real-time access
    setLayout(newLayout);
    layoutRef.current = newLayout;
    setRewards(newLayout.rewards);
    rewardsRef.current = newLayout.rewards;
    setScore(0);
    setRevealedRewards([]);
    setIsRoundEnded(false);
    setPendingRound(null);
    setEndCountdown(END_COUNTDOWN_SECONDS);
    setStartCountdown(null);
    eventsRef.current = [];
    resetTracking();
    resetRewardDetection();
    setIsStarted(false);
  }, [condition, roundIndex, participantId, resetTracking, resetRewardDetection]);

  // Animation loop for canvas - stops when round ends to prevent re-renders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If round ended, draw once and stop (freeze frame)
    if (isRoundEnded) {
      // Draw final frame
      ctx.fillStyle = CANVAS_BACKGROUND;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
      // Draw all collected rewards as gray dots
      for (const reward of rewards) {
        if (reward.collected) {
          ctx.fillStyle = '#888888';
          ctx.beginPath();
          ctx.arc(reward.x, reward.y, REWARD_DOT_SIZE, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Don't start animation loop
      return;
    }

    const draw = () => {
      const now = performance.now();

      // Clear canvas
      ctx.fillStyle = CANVAS_BACKGROUND;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw all collected rewards as gray dots (permanent)
      for (const reward of rewards) {
        if (reward.collected) {
          ctx.fillStyle = '#888888';
          ctx.beginPath();
          ctx.arc(reward.x, reward.y, REWARD_DOT_SIZE, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw flash effect for recently collected rewards (only during active play)
      const activeRevealed = revealedRewards.filter(r => r.expireAt > now);
      
      for (const { reward, expireAt } of activeRevealed) {
        const remaining = expireAt - now;
        const alpha = Math.min(1, remaining / (REWARD_REVEAL_DURATION * 0.5));
        
        // Draw yellow glow on top of gray dot
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Outer glow
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, REWARD_DOT_SIZE + 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright circle
        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, REWARD_DOT_SIZE, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }

      // Clean up expired revealed rewards (flash effect only)
      if (activeRevealed.length !== revealedRewards.length) {
        setRevealedRewards(activeRevealed);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [rewards, revealedRewards, isRoundEnded]);

  // Handle canvas mouse events - disabled when round ends
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isStarted || isRoundEnded) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    handleMouseMove(x, y);
    checkPosition({ x, y });
  }, [isStarted, isRoundEnded, handleMouseMove, checkPosition]);

  const handleCanvasMouseEnter = useCallback(() => {
    if (!isStarted || isRoundEnded) return;
    handleMouseEnter();
    
    // Log mouse enter event
    const event: GameEvent = {
      sessionId,
      roundIndex,
      eventType: 'mouse_enter',
      timestampMs: Math.round(performance.now() - roundStartTimeRef.current),
      timestampAbs: new Date().toISOString()
    };
    saveEvent(event);
  }, [isStarted, isRoundEnded, handleMouseEnter, sessionId, roundIndex]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (!isStarted || isRoundEnded) return;
    handleMouseLeave();
    
    // Log mouse leave event
    const event: GameEvent = {
      sessionId,
      roundIndex,
      eventType: 'mouse_leave',
      timestampMs: Math.round(performance.now() - roundStartTimeRef.current),
      timestampAbs: new Date().toISOString()
    };
    saveEvent(event);
  }, [isStarted, isRoundEnded, handleMouseLeave, sessionId, roundIndex]);

  // Start round - initiates 5-second countdown
  const handleStart = useCallback(() => {
    // Prevent double-click
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    
    initAudio();
    
    // Start the 5-second countdown
    setStartCountdown(START_COUNTDOWN_SECONDS);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.roundInfo}>
          Round {roundIndex + 1}
        </div>
        <div className={styles.score}>
          Score: <span className={styles.scoreValue}>{score}</span> / {N_REWARDS}
        </div>
        <div className={styles.timer}>
          {isRoundEnded ? "Round Complete" : formattedTime}
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.canvas}
          onMouseMove={handleCanvasMouseMove}
          onMouseEnter={handleCanvasMouseEnter}
          onMouseLeave={handleCanvasMouseLeave}
        />

        {!isStarted && !isRoundEnded && startCountdown === null && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <h2>Round {roundIndex + 1}</h2>
              <p>Move your mouse across the canvas to find hidden rewards.</p>
              <p>You'll hear a sound when you find one!</p>
              <button onClick={handleStart} className={styles.startButton}>
                Start Round
              </button>
            </div>
          </div>
        )}

        {startCountdown !== null && !isStarted && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownContent}>
              <h2>Round {roundIndex + 1}</h2>
              <p className={styles.getReady}>Get Ready!</p>
              <div className={styles.countdownTimer}>
                <span className={styles.countdownNumber}>{startCountdown}</span>
              </div>
              <p className={styles.countdownText}>
                Starting in {startCountdown} second{startCountdown !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>
        )}

        {isRoundEnded && (
          <div className={styles.countdownOverlay}>
            <div className={styles.countdownContent}>
              <h2>Round Complete</h2>
              <p className={styles.finalScore}>
                You found <strong>{score}</strong> of <strong>{N_REWARDS}</strong> rewards
              </p>
              <div className={styles.countdownTimer}>
                <span className={styles.countdownNumber}>{endCountdown}</span>
              </div>
              <p className={styles.countdownText}>
                Next round starts in {endCountdown} second{endCountdown !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.instructions}>
          {!isRoundEnded && `Explore the canvas with your mouse to find all ${N_REWARDS} hidden rewards`}
        </div>
      </div>
    </div>
  );
}
