// Agent Physics Hook - Keyboard-controlled movement (NetLogo style)
// Controls: J = rotate left, L = rotate right
// Physics: Constant forward velocity, automatic movement

import { useRef, useCallback, useEffect, useState } from 'react';
import type { AgentState, MovementSample, Position } from '../types/schema';
import type { Condition } from '../config/constants';
import {
  AGENT_SPEED,
  AGENT_ROTATION_SPEED,
  AGENT_START_X,
  AGENT_START_Y,
  AGENT_START_HEADING,
  CANVAS_SIZE,
  SAMPLE_INTERVAL,
  FRAME_INTERVAL
} from '../config/constants';

interface UseAgentPhysicsProps {
  sessionId: string;
  participantId: string;
  condition: Condition;
  roundIndex: number;
  isActive: boolean;
  roundStartTime: number;
  onSampleBatch: (samples: MovementSample[]) => void;
  onPositionUpdate?: (agent: AgentState) => void;
  onBoundaryHit?: (agent: AgentState, boundary: 'top' | 'bottom' | 'left' | 'right') => void;
  collisionCheck?: (agent: AgentState) => boolean; // Check if position collides with walls
  onCollision?: (agent: AgentState) => void; // Called when collision occurs (after reset)
  startPosition?: Position;
  startHeading?: number;
  batchSize?: number;
  wrapBoundaries?: boolean; // If true, wrap around edges; if false, stop at edges
}

interface KeyState {
  left: boolean;  // J key
  right: boolean; // L key
}

export function useAgentPhysics({
  sessionId,
  participantId,
  condition,
  roundIndex,
  isActive,
  roundStartTime,
  onSampleBatch,
  onPositionUpdate,
  onBoundaryHit,
  collisionCheck,
  onCollision,
  startPosition,
  startHeading = AGENT_START_HEADING,
  batchSize = 100,
  wrapBoundaries = false
}: UseAgentPhysicsProps) {
  // Agent state
  const [agent, setAgent] = useState<AgentState>({
    x: startPosition?.x ?? AGENT_START_X,
    y: startPosition?.y ?? AGENT_START_Y,
    heading: startHeading,
    velocity: AGENT_SPEED
  });

  // Refs for real-time access in animation loop
  const agentRef = useRef<AgentState>(agent);
  const keyStateRef = useRef<KeyState>({ left: false, right: false });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastSampleTimeRef = useRef<number>(0);
  const sampleBuffer = useRef<MovementSample[]>([]);
  const foodCollectedThisFrame = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(isActive);
  const isInCollisionRef = useRef<boolean>(false); // Track if currently in collision state

  // Keep refs in sync
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Convert degrees to radians
  const degreesToRadians = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
  };

  // Move agent forward based on heading
  const moveForward = useCallback((currentAgent: AgentState, deltaTime: number): AgentState => {
    const radians = degreesToRadians(currentAgent.heading);
    const distance = currentAgent.velocity * (deltaTime / FRAME_INTERVAL);
    
    let newX = currentAgent.x + Math.cos(radians) * distance;
    let newY = currentAgent.y - Math.sin(radians) * distance; // Subtract because Y increases downward in canvas

    // Handle boundaries
    if (wrapBoundaries) {
      // Wrap around edges
      if (newX < 0) newX = CANVAS_SIZE + newX;
      if (newX >= CANVAS_SIZE) newX = newX - CANVAS_SIZE;
      if (newY < 0) newY = CANVAS_SIZE + newY;
      if (newY >= CANVAS_SIZE) newY = newY - CANVAS_SIZE;
    } else {
      // Clamp to boundaries and notify
      let hitBoundary: 'top' | 'bottom' | 'left' | 'right' | null = null;
      
      if (newX < 0) {
        newX = 0;
        hitBoundary = 'left';
      } else if (newX >= CANVAS_SIZE) {
        newX = CANVAS_SIZE - 1;
        hitBoundary = 'right';
      }
      
      if (newY < 0) {
        newY = 0;
        hitBoundary = 'top';
      } else if (newY >= CANVAS_SIZE) {
        newY = CANVAS_SIZE - 1;
        hitBoundary = 'bottom';
      }

      if (hitBoundary && onBoundaryHit) {
        onBoundaryHit({ ...currentAgent, x: newX, y: newY }, hitBoundary);
      }
    }

    return {
      ...currentAgent,
      x: newX,
      y: newY
    };
  }, [wrapBoundaries, onBoundaryHit]);

  // Rotate agent
  const rotate = useCallback((currentAgent: AgentState, direction: 'left' | 'right', deltaTime: number): AgentState => {
    const rotationAmount = AGENT_ROTATION_SPEED * (deltaTime / FRAME_INTERVAL);
    let newHeading = currentAgent.heading;
    
    if (direction === 'left') {
      newHeading += rotationAmount; // Counter-clockwise
    } else {
      newHeading -= rotationAmount; // Clockwise
    }

    // Normalize heading to 0-360
    newHeading = ((newHeading % 360) + 360) % 360;

    return {
      ...currentAgent,
      heading: newHeading
    };
  }, []);

  // Create movement sample
  const createSample = useCallback((currentAgent: AgentState, lastAgent: AgentState | null): MovementSample => {
    const now = performance.now();
    const timestampMs = now - roundStartTime;
    
    let distanceFromLast = 0;
    if (lastAgent) {
      const dx = currentAgent.x - lastAgent.x;
      const dy = currentAgent.y - lastAgent.y;
      distanceFromLast = Math.sqrt(dx * dx + dy * dy);
    }

    return {
      sessionId,
      participantId,
      condition,
      roundIndex,
      timestampMs: Math.round(timestampMs),
      timestampAbs: new Date().toISOString(),
      x: Math.round(currentAgent.x),
      y: Math.round(currentAgent.y),
      heading: Math.round(currentAgent.heading * 10) / 10,
      velocity: currentAgent.velocity,
      distanceFromLast: Math.round(distanceFromLast * 100) / 100,
      acceleration: 0, // Constant velocity, no acceleration
      foodHere: foodCollectedThisFrame.current
    };
  }, [sessionId, participantId, condition, roundIndex, roundStartTime]);

  // Main animation loop
  useEffect(() => {
    if (!isActive) {
      // Cancel animation frame when not active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Flush remaining samples
      if (sampleBuffer.current.length > 0) {
        onSampleBatch([...sampleBuffer.current]);
        sampleBuffer.current = [];
      }
      return;
    }

    let lastAgentForSample: AgentState | null = null;

    const gameLoop = (timestamp: number) => {
      if (!isActiveRef.current) return;

      // Calculate delta time
      const deltaTime = lastFrameTimeRef.current > 0 
        ? timestamp - lastFrameTimeRef.current 
        : FRAME_INTERVAL;
      lastFrameTimeRef.current = timestamp;

      // Get current state
      let currentAgent = { ...agentRef.current };

      // Apply rotation based on key state
      const keys = keyStateRef.current;
      if (keys.left && !keys.right) {
        currentAgent = rotate(currentAgent, 'left', deltaTime);
      } else if (keys.right && !keys.left) {
        currentAgent = rotate(currentAgent, 'right', deltaTime);
      }

      // Move forward (always)
      currentAgent = moveForward(currentAgent, deltaTime);

      // Check for collision BEFORE updating ref (atomic collision handling)
      if (collisionCheck) {
        const isColliding = collisionCheck(currentAgent);
        
        if (isColliding && !isInCollisionRef.current) {
          // New collision detected - reset to start position
          isInCollisionRef.current = true;
          
          // Notify collision callback before resetting
          if (onCollision) {
            onCollision(currentAgent);
          }
          
          // Reset to start position
          currentAgent = {
            x: startPosition?.x ?? AGENT_START_X,
            y: startPosition?.y ?? AGENT_START_Y,
            heading: startHeading,
            velocity: AGENT_SPEED
          };
        } else if (!isColliding && isInCollisionRef.current) {
          // Agent has left collision area, reset flag
          isInCollisionRef.current = false;
        }
      }

      // Update ref immediately (for smooth rendering via callback)
      agentRef.current = currentAgent;
      
      // Notify position update (for rendering - collision already handled)
      if (onPositionUpdate) {
        onPositionUpdate(currentAgent);
      }

      // Sample at fixed interval (10Hz) - also update React state here for UI
      const timeSinceLastSample = timestamp - lastSampleTimeRef.current;
      if (timeSinceLastSample >= SAMPLE_INTERVAL) {
        // Update React state only at sample rate (10Hz) to avoid lag
        setAgent(currentAgent);
        
        const sample = createSample(currentAgent, lastAgentForSample);
        sampleBuffer.current.push(sample);
        lastAgentForSample = { ...currentAgent };
        lastSampleTimeRef.current = timestamp;
        
        // Reset food flag after sampling
        foodCollectedThisFrame.current = false;

        // Flush buffer if batch size reached
        if (sampleBuffer.current.length >= batchSize) {
          onSampleBatch([...sampleBuffer.current]);
          sampleBuffer.current = [];
        }
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Start loop
    lastFrameTimeRef.current = performance.now();
    lastSampleTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, rotate, moveForward, createSample, onPositionUpdate, onSampleBatch, batchSize, collisionCheck, onCollision, startPosition, startHeading]);

  // Keyboard event handlers
  // Controls: A or ArrowLeft = turn left, D or ArrowRight = turn right
  // Uses e.code for physical key detection (works with any keyboard language)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActiveRef.current) return;
      
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') {
        keyStateRef.current.left = true;
        e.preventDefault(); // Prevent page scrolling with arrow keys
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        keyStateRef.current.right = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') {
        keyStateRef.current.left = false;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        keyStateRef.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Reset agent to initial position
  const reset = useCallback((position?: Position, heading?: number) => {
    const newAgent: AgentState = {
      x: position?.x ?? startPosition?.x ?? AGENT_START_X,
      y: position?.y ?? startPosition?.y ?? AGENT_START_Y,
      heading: heading ?? startHeading,
      velocity: AGENT_SPEED
    };
    setAgent(newAgent);
    agentRef.current = newAgent;
    keyStateRef.current = { left: false, right: false };
    lastFrameTimeRef.current = 0;
    lastSampleTimeRef.current = 0;
    sampleBuffer.current = [];
    foodCollectedThisFrame.current = false;
    isInCollisionRef.current = false;
  }, [startPosition, startHeading]);

  // Mark that food was collected this frame (for logging)
  const markFoodCollected = useCallback(() => {
    foodCollectedThisFrame.current = true;
  }, []);

  // Flush remaining samples
  const flush = useCallback(() => {
    if (sampleBuffer.current.length > 0) {
      onSampleBatch([...sampleBuffer.current]);
      sampleBuffer.current = [];
    }
  }, [onSampleBatch]);

  // Get current agent state (for external collision detection)
  const getAgent = useCallback((): AgentState => {
    return { ...agentRef.current };
  }, []);

  // Check if agent is at a specific position (within radius)
  const isAtPosition = useCallback((target: Position, radius: number): boolean => {
    const current = agentRef.current;
    const dx = current.x - target.x;
    const dy = current.y - target.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }, []);

  return {
    agent,
    reset,
    flush,
    getAgent,
    isAtPosition,
    markFoodCollected,
    keyState: keyStateRef.current
  };
}

