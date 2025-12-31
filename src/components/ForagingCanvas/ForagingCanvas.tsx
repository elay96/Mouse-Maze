// Foraging Canvas Component - Agent-based resource collection (NetLogo style)
// Phase 2: Spatial Foraging with keyboard-controlled agent

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Reward, MovementSample, GameEvent, Round, AgentState } from '../../types/schema';
import type { Condition } from '../../config/constants';
import {
  CANVAS_SIZE,
  CANVAS_BACKGROUND,
  N_REWARDS,
  INTER_ROUND_DELAY,
  AGENT_SIZE,
  AGENT_COLOR,
  RESOURCE_COLLECTED_COLOR,
  HIT_RADIUS,
  START_COUNTDOWN_SECONDS
} from '../../config/constants';
import { useAgentPhysics } from '../../hooks/useAgentPhysics';
import { useGameTimer } from '../../hooks/useGameTimer';
import { generateRoundLayout } from '../../utils/conditionGenerator';
import { saveMovementBatch, saveEvent, saveRound } from '../../utils/database';
import { initAudio, playRewardChime } from '../../utils/audioFeedback';
import styles from './ForagingCanvas.module.css';

interface ForagingCanvasProps {
  sessionId: string;
  participantId: string;
  condition: Condition;
  roundIndex: number;
  onRoundComplete: (round: Round) => void;
}

// Countdown durations in seconds
const END_COUNTDOWN_SECONDS = Math.ceil(INTER_ROUND_DELAY / 1000);

export function ForagingCanvas({
  sessionId,
  participantId,
  condition,
  roundIndex,
  onRoundComplete
}: ForagingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [layout, setLayout] = useState<{
    rewards: Reward[];
    clusterParams?: { k: number; centers: Array<{ x: number; y: number; radius: number }> };
  } | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isRoundEnded, setIsRoundEnded] = useState(false);
  const [pendingRound, setPendingRound] = useState<Round | null>(null);
  const [endCountdown, setEndCountdown] = useState(END_COUNTDOWN_SECONDS);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  
  const roundStartTimeRef = useRef<number>(0);
  const eventsRef = useRef<GameEvent[]>([]);
  const isEndingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const rewardsRef = useRef<Reward[]>([]);
  const layoutRef = useRef<typeof layout>(null);
  const collectedIdsRef = useRef<Set<number>>(new Set());

  // Timer hook
  const { start: startTimer, stop: stopTimer, formattedTime } = useGameTimer({
    onTimeUp: () => handleRoundEnd('timeout')
  });

  // Handle round completion
  const handleRoundEnd = useCallback((reason: 'all_rewards' | 'timeout', finalScore?: number) => {
    if (isEndingRef.current || !layoutRef.current) return;
    isEndingRef.current = true;

    stopTimer();
    setIsRoundEnded(true);
    setEndCountdown(END_COUNTDOWN_SECONDS);

    const endTimestamp = new Date().toISOString();
    const durationMs = performance.now() - roundStartTimeRef.current;
    const authoritativeScore = finalScore ?? collectedIdsRef.current.size;
    
    setScore(authoritativeScore);

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

    saveEvent(endEvent).catch(console.error);
    eventsRef.current.push(endEvent);

    const round: Round = {
      sessionId,
      roundIndex,
      condition,
      startTimestamp: new Date(roundStartTimeRef.current).toISOString(),
      endTimestamp,
      durationMs: Math.round(durationMs),
      rewardsCollected: authoritativeScore,
      resourcePositions: rewardsRef.current,
      clusterParams: layoutRef.current.clusterParams,
      endReason: reason
    };

    saveRound(round).catch(console.error);
    setPendingRound(round);
  }, [sessionId, roundIndex, condition, stopTimer]);

  // Handle sample batch save
  const handleSampleBatch = useCallback(async (samples: MovementSample[]) => {
    await saveMovementBatch(samples);
  }, []);

  // Check for resource collision when agent position updates
  const handlePositionUpdate = useCallback((agent: AgentState) => {
    if (!isStarted || isRoundEnded) return;
    
    const rewards = rewardsRef.current;
    const now = performance.now();
    const timestampMs = Math.round(now - roundStartTimeRef.current);
    const timestampAbs = new Date().toISOString();

    for (const reward of rewards) {
      if (collectedIdsRef.current.has(reward.id)) continue;

      const dx = agent.x - reward.x;
      const dy = agent.y - reward.y;
      const distanceSquared = dx * dx + dy * dy;
      const hitRadiusSquared = HIT_RADIUS * HIT_RADIUS;

      if (distanceSquared <= hitRadiusSquared) {
        collectedIdsRef.current.add(reward.id);
        const newCount = collectedIdsRef.current.size;
        
        playRewardChime();
        markFoodCollected();

        // Update rewards state
        setRewards(prev => {
          const updated = prev.map(r => 
            r.id === reward.id ? { ...r, collected: true, timestampCollected: timestampAbs } : r
          );
          rewardsRef.current = updated;
          return updated;
        });

        setScore(newCount);

        const event: GameEvent = {
          sessionId,
          roundIndex,
          eventType: 'reward_hit',
          timestampMs,
          timestampAbs,
          metadata: {
            rewardIndex: reward.id,
            rewardPosition: { x: reward.x, y: reward.y },
            totalRewardsCollected: newCount,
            agentPosition: { x: agent.x, y: agent.y },
            agentHeading: agent.heading
          }
        };

        saveEvent(event).catch(console.error);
        eventsRef.current.push(event);

        if (newCount >= N_REWARDS) {
          handleRoundEnd('all_rewards', N_REWARDS);
          return;
        }
      }
    }
  }, [isStarted, isRoundEnded, sessionId, roundIndex, handleRoundEnd]);

  // Agent physics hook
  const { 
    agent, 
    reset: resetAgent,
    markFoodCollected
  } = useAgentPhysics({
    sessionId,
    participantId,
    condition,
    roundIndex,
    isActive: isStarted && !isRoundEnded,
    roundStartTime: roundStartTimeRef.current,
    onSampleBatch: handleSampleBatch,
    onPositionUpdate: handlePositionUpdate,
    wrapBoundaries: true // Wrap around edges like NetLogo
  });

  // End countdown timer effect
  useEffect(() => {
    if (!isRoundEnded || !pendingRound) return;

    const countdownInterval = setInterval(() => {
      setEndCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(countdownInterval);
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

  // Start countdown timer effect
  useEffect(() => {
    if (startCountdown === null) return;

    if (startCountdown <= 0) {
      isStartingRef.current = false;
      setStartCountdown(null);
      
      roundStartTimeRef.current = performance.now();
      setIsStarted(true);
      startTimer();

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

    const timer = setTimeout(() => {
      setStartCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [startCountdown, sessionId, roundIndex, startTimer]);

  // Initialize round with seeded layout
  useEffect(() => {
    isEndingRef.current = false;
    isStartingRef.current = false;
    roundStartTimeRef.current = 0;
    collectedIdsRef.current.clear();
    
    const seed = `${participantId}|${roundIndex}`;
    const newLayout = generateRoundLayout(condition, seed);
    
    setLayout(newLayout);
    layoutRef.current = newLayout;
    setRewards(newLayout.rewards);
    rewardsRef.current = newLayout.rewards;
    setScore(0);
    setIsRoundEnded(false);
    setPendingRound(null);
    setEndCountdown(END_COUNTDOWN_SECONDS);
    setStartCountdown(null);
    eventsRef.current = [];
    resetAgent();
    setIsStarted(false);
  }, [condition, roundIndex, participantId, resetAgent]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Black background (resources hidden until collected)
      ctx.fillStyle = CANVAS_BACKGROUND;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw collected resources as blue dots
      for (const reward of rewards) {
        if (reward.collected) {
          ctx.fillStyle = RESOURCE_COLLECTED_COLOR;
          ctx.beginPath();
          ctx.arc(reward.x, reward.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw agent (yellow triangle) if game is active
      if (isStarted || startCountdown !== null) {
        ctx.save();
        ctx.translate(agent.x, agent.y);
        ctx.rotate(-agent.heading * Math.PI / 180 + Math.PI / 2); // Adjust for canvas coordinate system

        ctx.fillStyle = AGENT_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, -AGENT_SIZE);
        ctx.lineTo(-AGENT_SIZE * 0.6, AGENT_SIZE * 0.6);
        ctx.lineTo(AGENT_SIZE * 0.6, AGENT_SIZE * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      if (!isRoundEnded) {
        requestAnimationFrame(draw);
      }
    };

    const animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [rewards, agent, isStarted, isRoundEnded, startCountdown]);

  // Start round handler
  const handleStart = useCallback(() => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    
    initAudio();
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
          tabIndex={0}
        />

        {!isStarted && !isRoundEnded && startCountdown === null && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <h2>Round {roundIndex + 1}</h2>
              <p>Navigate using keyboard controls:</p>
              <div className={styles.controls}>
                <div className={styles.key}>
                  <span className={styles.keyLabel}>A</span>
                  <span className={styles.keyOr}>or</span>
                  <span className={styles.keyLabel}>←</span>
                  <span className={styles.keyAction}>Turn Left</span>
                </div>
                <div className={styles.key}>
                  <span className={styles.keyLabel}>D</span>
                  <span className={styles.keyOr}>or</span>
                  <span className={styles.keyLabel}>→</span>
                  <span className={styles.keyAction}>Turn Right</span>
                </div>
              </div>
              <p className={styles.hint}>Your agent moves forward automatically. Collect the hidden resources!</p>
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
                You collected <strong>{score}</strong> of <strong>{N_REWARDS}</strong> resources
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
        <div className={styles.conditionBadge} data-condition={condition}>
          {condition}
        </div>
        <div className={styles.instructions}>
          {!isRoundEnded && isStarted && "Press A or ← to turn left, D or → to turn right"}
        </div>
      </div>
    </div>
  );
}

