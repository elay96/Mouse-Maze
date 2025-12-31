// Maze Canvas Component - Phase 1 Training (NetLogo style)
// Navigate to red target without hitting blue walls
// Agent resets to start position on wall collision

import { useRef, useEffect, useCallback, useState } from 'react';
import type { AgentState, GameEvent, Position } from '../../types/schema';
import {
  CANVAS_SIZE,
  CANVAS_BACKGROUND,
  MAZE_WALL_THICKNESS,
  MAZE_TARGET_SIZE,
  MAZE_START_X,
  MAZE_START_Y,
  MAZE_TARGET_X,
  MAZE_TARGET_Y,
  MAZE_WALL_COLOR,
  MAZE_TARGET_COLOR,
  AGENT_SIZE,
  AGENT_COLOR
} from '../../config/constants';
import { useAgentPhysics } from '../../hooks/useAgentPhysics';
import { saveEvent } from '../../utils/database';
import { initAudio } from '../../utils/audioFeedback';
import styles from './MazeCanvas.module.css';

interface MazeCanvasProps {
  sessionId: string;
  participantId: string;
  onComplete: () => void;
}

// Define maze walls as rectangles
interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Generate a simple slalom maze layout
// Player starts bottom-left, navigates through two horizontal barriers with alternating gaps
function generateMazeWalls(): Wall[] {
  const t = MAZE_WALL_THICKNESS;
  const s = CANVAS_SIZE;
  
  return [
    // Outer boundary (4 walls)
    { x: 0, y: 0, width: s, height: t },           // Top wall
    { x: 0, y: s - t, width: s, height: t },       // Bottom wall
    { x: 0, y: 0, width: t, height: s },           // Left wall
    { x: s - t, y: 0, width: t, height: s },       // Right wall
    
    // Bottom horizontal barrier - gap on RIGHT side
    // Player must go RIGHT to pass through
    { x: t, y: 600, width: 650, height: t },
    
    // Top horizontal barrier - gap on LEFT side
    // Player must go LEFT to pass through
    { x: 330, y: 350, width: 650, height: t },
  ];
}

export function MazeCanvas({
  sessionId,
  participantId,
  onComplete
}: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // Use state instead of ref for proper re-renders
  const [collisionCount, setCollisionCount] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [walls] = useState<Wall[]>(generateMazeWalls);
  
  const mazeStartTimeRef = useRef<number>(0);
  const agentRef = useRef<AgentState>({ x: MAZE_START_X, y: MAZE_START_Y, heading: 90, velocity: 0 });
  
  // Ref to store resetAgent function - breaks circular dependency
  const resetAgentRef = useRef<((position?: Position, heading?: number) => void) | null>(null);

  // Check if agent collides with any wall
  const checkWallCollision = useCallback((agent: AgentState): boolean => {
    const agentRadius = AGENT_SIZE * 0.6;
    
    for (const wall of walls) {
      // Simple AABB collision with circular agent
      const closestX = Math.max(wall.x, Math.min(agent.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(agent.y, wall.y + wall.height));
      
      const dx = agent.x - closestX;
      const dy = agent.y - closestY;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared < agentRadius * agentRadius) {
        return true;
      }
    }
    return false;
  }, [walls]);

  // Check if agent reached target
  const checkTargetReached = useCallback((agent: AgentState): boolean => {
    const targetCenterX = MAZE_TARGET_X + MAZE_TARGET_SIZE / 2;
    const targetCenterY = MAZE_TARGET_Y + MAZE_TARGET_SIZE / 2;
    
    const dx = agent.x - targetCenterX;
    const dy = agent.y - targetCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (MAZE_TARGET_SIZE / 2 + AGENT_SIZE * 0.4);
  }, []);

  // Handle position updates - uses ref to call resetAgent to avoid circular dependency
  const handlePositionUpdate = useCallback((agent: AgentState) => {
    // Update agentRef for smooth canvas rendering
    agentRef.current = agent;
    
    if (!isStarted || isCompleted) return;
    
    // Check wall collision (point-based)
    if (checkWallCollision(agent)) {
      setCollisionCount(prev => prev + 1);
      
      // Log collision event
      const event: GameEvent = {
        sessionId,
        roundIndex: -1, // Maze phase
        eventType: 'maze_collision',
        timestampMs: Math.round(performance.now() - mazeStartTimeRef.current),
        timestampAbs: new Date().toISOString(),
        metadata: {
          agentPosition: { x: agent.x, y: agent.y },
          agentHeading: agent.heading
        }
      };
      saveEvent(event).catch(console.error);
      
      // Reset agent position using ref (breaks circular dependency)
      if (resetAgentRef.current) {
        resetAgentRef.current({ x: MAZE_START_X, y: MAZE_START_Y }, 90);
      }
      return;
    }
    
    // Check target reached
    if (checkTargetReached(agent)) {
      setIsCompleted(true); // Use state setter for proper re-render
      
      // Log completion event
      const event: GameEvent = {
        sessionId,
        roundIndex: -1,
        eventType: 'maze_complete',
        timestampMs: Math.round(performance.now() - mazeStartTimeRef.current),
        timestampAbs: new Date().toISOString(),
        metadata: {
          agentPosition: { x: agent.x, y: agent.y },
          agentHeading: agent.heading
        }
      };
      saveEvent(event).catch(console.error);
      
      // Notify parent
      onComplete();
    }
  }, [isStarted, isCompleted, sessionId, checkWallCollision, checkTargetReached, onComplete]);

  // Agent physics (no-op sample batch for maze phase)
  const handleSampleBatch = useCallback(() => {}, []);

  const { 
    reset: resetAgent
  } = useAgentPhysics({
    sessionId,
    participantId,
    condition: 'DIFFUSE', // Placeholder - not used in maze
    roundIndex: -1,
    isActive: isStarted && !isCompleted, // Now uses state, will properly stop when completed
    roundStartTime: mazeStartTimeRef.current,
    onSampleBatch: handleSampleBatch,
    onPositionUpdate: handlePositionUpdate,
    startPosition: { x: MAZE_START_X, y: MAZE_START_Y },
    startHeading: 90,
    wrapBoundaries: false
  });

  // Keep resetAgentRef updated with the latest resetAgent function
  useEffect(() => {
    resetAgentRef.current = resetAgent;
  }, [resetAgent]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Black background
      ctx.fillStyle = CANVAS_BACKGROUND;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw walls (blue)
      ctx.fillStyle = MAZE_WALL_COLOR;
      for (const wall of walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }

      // Draw target (red square)
      ctx.fillStyle = MAZE_TARGET_COLOR;
      ctx.fillRect(MAZE_TARGET_X, MAZE_TARGET_Y, MAZE_TARGET_SIZE, MAZE_TARGET_SIZE);

      // Draw agent (yellow triangle) - use ref for smooth 60fps rendering
      if (isStarted) {
        const currentAgent = agentRef.current;
        ctx.save();
        ctx.translate(currentAgent.x, currentAgent.y);
        ctx.rotate(-currentAgent.heading * Math.PI / 180 + Math.PI / 2);

        ctx.fillStyle = AGENT_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, -AGENT_SIZE);
        ctx.lineTo(-AGENT_SIZE * 0.6, AGENT_SIZE * 0.6);
        ctx.lineTo(AGENT_SIZE * 0.6, AGENT_SIZE * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      if (!isCompleted) {
        animationId = requestAnimationFrame(draw);
      }
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [walls, isStarted, isCompleted]);

  // Start handler
  const handleStart = useCallback(() => {
    initAudio();
    setShowInstructions(false);
    mazeStartTimeRef.current = performance.now();
    setIsStarted(true);

    // Log start event
    const event: GameEvent = {
      sessionId,
      roundIndex: -1,
      eventType: 'maze_start',
      timestampMs: 0,
      timestampAbs: new Date().toISOString()
    };
    saveEvent(event).catch(console.error);
  }, [sessionId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.phase}>
          Phase 1: Training
        </div>
        <div className={styles.stats}>
          Collisions: <span className={styles.collisionCount}>{collisionCount}</span>
        </div>
        <div className={styles.objective}>
          Reach the <span className={styles.targetText}>RED TARGET</span>
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

        {showInstructions && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <h2>Training Phase</h2>
              <p>Learn to navigate before the foraging task.</p>
              
              <div className={styles.objective}>
                <div className={styles.targetPreview} />
                <span>Navigate to the RED target</span>
              </div>
              
              <div className={styles.warning}>
                <div className={styles.wallPreview} />
                <span>Avoid BLUE walls (you'll restart on contact)</span>
              </div>

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
              
              <p className={styles.hint}>Your agent moves forward automatically.</p>
              
              <button onClick={handleStart} className={styles.startButton}>
                Begin Training
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.instructions}>
          {isStarted && "Press A or ← to turn left, D or → to turn right. Reach the red target!"}
        </div>
      </div>
    </div>
  );
}
