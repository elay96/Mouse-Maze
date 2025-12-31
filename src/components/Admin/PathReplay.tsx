// Path Replay Visualization

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Round, MovementSample, GameEvent } from '../../types/schema';
import { CANVAS_SIZE, BLACK_PIXEL_COLOR, CANVAS_BACKGROUND, GRID_SIZE } from '../../config/constants';
import styles from './PathReplay.module.css';

interface PathReplayProps {
  round: Round;
  movements: MovementSample[];
  events: GameEvent[];
}

export interface PathReplayHandle {
  getScreenshot: () => string | null;
}

export const PathReplay = forwardRef<PathReplayHandle, PathReplayProps>(({ round, movements, events }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [finalScreenshot, setFinalScreenshot] = useState<string | null>(null);
  const [hasAutoCapture, setHasAutoCapture] = useState(false);
  
  const maxTime = round.durationMs || 0;
  const rewardEvents = events.filter(e => e.eventType === 'reward_hit');
  const sortedMovements = [...movements].sort((a, b) => a.timestampMs - b.timestampMs);

  // Reset state when round changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setFinalScreenshot(null);
    setHasAutoCapture(false);
  }, [round.roundIndex]);

  // Expose screenshot function via ref
  useImperativeHandle(ref, () => ({
    getScreenshot: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }
  }));

  // Find the movement index at current time
  const getCurrentMovementIndex = useCallback((time: number) => {
    let idx = 0;
    for (let i = 0; i < sortedMovements.length; i++) {
      if (sortedMovements[i].timestampMs <= time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [sortedMovements]);

  // Calculate heatmap data
  const heatmapData = useCallback(() => {
    const cellSize = CANVAS_SIZE / GRID_SIZE;
    const counts: number[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    let maxCount = 0;

    for (const m of movements) {
      const cellX = Math.min(GRID_SIZE - 1, Math.floor(m.x / cellSize));
      const cellY = Math.min(GRID_SIZE - 1, Math.floor(m.y / cellSize));
      counts[cellY][cellX]++;
      maxCount = Math.max(maxCount, counts[cellY][cellX]);
    }

    return { counts, maxCount, cellSize };
  }, [movements]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentIdx = getCurrentMovementIndex(currentTime);
    const visibleMovements = sortedMovements.slice(0, currentIdx + 1);

    // Clear canvas
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw heatmap if enabled
    if (showHeatmap) {
      const { counts, maxCount, cellSize } = heatmapData();
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (counts[y][x] > 0) {
            const intensity = counts[y][x] / maxCount;
            const r = Math.floor(255 * intensity);
            const g = Math.floor(255 * (1 - intensity) * 0.5);
            const b = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // Draw black pixels (faded) - legacy support
    if (round.blackPixelPositions && round.blackPixelPositions.length > 0) {
      ctx.fillStyle = `${BLACK_PIXEL_COLOR}40`;
      for (const pixel of round.blackPixelPositions) {
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw reward/resource positions
    const positions = round.rewardPositions || round.resourcePositions || [];
    for (const reward of positions) {
      const collected = rewardEvents.some(
        e => e.metadata?.rewardIndex === reward.id && e.timestampMs <= currentTime
      );
      
      if (collected) {
        ctx.fillStyle = '#3fb95080';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#3fb950';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#60606040';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw path
    if (visibleMovements.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#58a6ff80';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(visibleMovements[0].x, visibleMovements[0].y);
      for (let i = 1; i < visibleMovements.length; i++) {
        ctx.lineTo(visibleMovements[i].x, visibleMovements[i].y);
      }
      ctx.stroke();
    }

    // Draw current position
    if (visibleMovements.length > 0) {
      const current = visibleMovements[visibleMovements.length - 1];
      
      // Outer glow
      ctx.fillStyle = '#58a6ff30';
      ctx.beginPath();
      ctx.arc(current.x, current.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner circle
      ctx.fillStyle = '#58a6ff';
      ctx.beginPath();
      ctx.arc(current.x, current.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [currentTime, sortedMovements, round, rewardEvents, showHeatmap, getCurrentMovementIndex, heatmapData]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTimestamp: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaReal = timestamp - lastTimestamp;
      const deltaGame = deltaReal * playbackSpeed;
      lastTimestamp = timestamp;

      setCurrentTime(prev => {
        const next = prev + deltaGame;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, maxTime]);

  // Draw on state change
  useEffect(() => {
    draw();
  }, [draw]);

  const handlePlayPause = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10);
    setCurrentTime(time);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const collectedByNow = rewardEvents.filter(e => e.timestampMs <= currentTime).length;

  // Download screenshot
  const handleDownloadScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `path-replay-round-${round.roundIndex + 1}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Jump to end (show final state)
  const handleJumpToEnd = () => {
    setCurrentTime(maxTime);
    setIsPlaying(false);
  };

  // Auto-capture screenshot when replay reaches end
  useEffect(() => {
    // Only capture once when reaching the end
    if (currentTime >= maxTime && !hasAutoCapture && maxTime > 0) {
      // Small delay to ensure canvas is fully rendered
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          setFinalScreenshot(dataUrl);
          setHasAutoCapture(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentTime, maxTime, hasAutoCapture]);

  // Download the final screenshot
  const handleDownloadFinalScreenshot = () => {
    if (!finalScreenshot) return;
    
    const link = document.createElement('a');
    link.download = `final-path-round-${round.roundIndex + 1}-${Date.now()}.png`;
    link.href = finalScreenshot;
    link.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.canvas}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.playbackControls}>
          <button onClick={handleReset} className={styles.controlButton} title="Reset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          
          <button onClick={handlePlayPause} className={styles.playButton}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button onClick={handleJumpToEnd} className={styles.controlButton} title="Jump to End">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 5v14l11-7z" />
              <rect x="16" y="5" width="3" height="14" />
            </svg>
          </button>

          <div className={styles.speedSelector}>
            {[0.5, 1, 2, 5, 10].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={styles.speedButton}
                data-active={playbackSpeed === speed}
              >
                {speed}×
              </button>
            ))}
          </div>

          <button onClick={handleDownloadScreenshot} className={styles.screenshotButton} title="Download Current Screenshot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            Screenshot
          </button>

          {finalScreenshot && (
            <button onClick={handleDownloadFinalScreenshot} className={styles.finalScreenshotButton} title="Download Final Path Screenshot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Final Path
            </button>
          )}
        </div>

        <div className={styles.timeline}>
          <span className={styles.timeDisplay}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={maxTime}
            value={currentTime}
            onChange={handleScrub}
            className={styles.scrubber}
          />
          <span className={styles.timeDisplay}>{formatTime(maxTime)}</span>
        </div>

        <div className={styles.rewardTimeline}>
          {rewardEvents.map((event, idx) => (
            <div
              key={idx}
              className={styles.rewardMarker}
              style={{ left: `${(event.timestampMs / maxTime) * 100}%` }}
              data-collected={event.timestampMs <= currentTime}
              title={`Reward ${event.metadata?.rewardIndex} at ${formatTime(event.timestampMs)}`}
            />
          ))}
        </div>

        <div className={styles.infoBar}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Collected:</span>
            <span className={styles.infoValue}>{collectedByNow}/{round.rewardsCollected}</span>
          </div>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            <span className={styles.toggle} />
            Show Heatmap
          </label>
        </div>
      </div>
    </div>
  );
});

