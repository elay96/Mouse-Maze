// Session Detail - Stats and Path Replay

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Session, Round, MovementSample, GameEvent, RoundStats } from '../../types/schema';
import { hasParticipantProfile } from '../../types/schema';
import { getFullSessionData } from '../../utils/database';
import { calculateRoundStats } from '../../utils/statsCalculator';
import { exportSessionJSON, exportMovementsCSV, exportEventsCSV, exportRoundSummaryCSV } from '../../utils/exportUtils';
import { PathReplay } from './PathReplay';
import { N_REWARDS, CANVAS_SIZE, CANVAS_BACKGROUND } from '../../config/constants';
import styles from './SessionDetail.module.css';

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [movements, setMovements] = useState<MovementSample[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'replay'>('stats');
  const screenshotCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    setIsLoading(true);
    const data = await getFullSessionData(sessionId);
    if (data) {
      setSession(data.session);
      setRounds(data.rounds);
      setMovements(data.movements);
      setEvents(data.events);
    }
    setIsLoading(false);
  };

  const roundStats = useMemo<RoundStats[]>(() => {
    return rounds.map(round => {
      const roundMovements = movements.filter(m => m.roundIndex === round.roundIndex);
      const roundEvents = events.filter(e => e.roundIndex === round.roundIndex);
      return calculateRoundStats(
        sessionId,
        round.roundIndex,
        roundMovements,
        roundEvents,
        round.durationMs || 0,
        round.rewardsCollected
      );
    });
  }, [rounds, movements, events, sessionId]);

  const currentRound = rounds[selectedRound];
  const currentStats = roundStats[selectedRound];
  const currentMovements = movements.filter(m => m.roundIndex === selectedRound);
  const currentEvents = events.filter(e => e.roundIndex === selectedRound);

  // Draw final path screenshot on canvas
  const drawFinalPath = useCallback(() => {
    const canvas = screenshotCanvasRef.current;
    if (!canvas || !currentRound) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sortedMovements = [...currentMovements].sort((a, b) => a.timestampMs - b.timestampMs);
    const rewardEvents = currentEvents.filter(e => e.eventType === 'reward_hit');

    // Clear canvas
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw reward positions
    for (const reward of currentRound.rewardPositions) {
      const collected = rewardEvents.some(e => e.metadata?.rewardIndex === reward.id);
      
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
        ctx.fillStyle = '#ff444480';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(reward.x, reward.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw complete path
    if (sortedMovements.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#58a6ff80';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(sortedMovements[0].x, sortedMovements[0].y);
      for (let i = 1; i < sortedMovements.length; i++) {
        ctx.lineTo(sortedMovements[i].x, sortedMovements[i].y);
      }
      ctx.stroke();
    }
  }, [currentRound, currentMovements, currentEvents]);

  // Draw screenshot when round changes
  useEffect(() => {
    if (activeTab === 'stats' && currentRound) {
      // Small delay to ensure canvas is ready
      const timer = setTimeout(drawFinalPath, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, currentRound, drawFinalPath, selectedRound]);

  // Download screenshot
  const handleDownloadScreenshot = () => {
    const canvas = screenshotCanvasRef.current;
    if (!canvas || !session) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `path-screenshot-${session.participantId}-round-${selectedRound + 1}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleExportJSON = () => {
    if (session) {
      exportSessionJSON(session, rounds, movements, events);
    }
  };

  const handleExportCSV = () => {
    if (session) {
      exportMovementsCSV(movements, session.participantId, session.startTimestamp);
      exportEventsCSV(events, session.participantId, session.startTimestamp);
      exportRoundSummaryCSV(rounds, movements, events, session.participantId, session.startTimestamp);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading session data...</div>
      </div>
    );
  }

  if (!session || !currentRound) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Session not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className={styles.sessionInfo}>
          <h1 className={styles.participantId}>
            {hasParticipantProfile(session) ? session.fullName : session.participantId}
          </h1>
          <div className={styles.meta}>
            {hasParticipantProfile(session) && (
              <span className={styles.ageGender}>
                {session.age} / {session.gender === 'male' ? 'Male' : session.gender === 'female' ? 'Female' : 'Other'}
              </span>
            )}
            {!hasParticipantProfile(session) && (
              <span className={styles.legacyBadge}>Legacy ID</span>
            )}
            <span className={styles.conditionBadge} data-condition={session.condition}>
              {session.condition}
            </span>
            <span className={styles.date}>{formatDate(session.startTimestamp)}</span>
            <span className={styles.statusBadge} data-status={session.status}>
              {session.status}
            </span>
          </div>
        </div>

        <div className={styles.exportButtons}>
          <button onClick={handleExportJSON} className={styles.exportButton}>
            Export JSON
          </button>
          <button onClick={handleExportCSV} className={styles.exportButton}>
            Export CSV
          </button>
        </div>
      </header>

      <div className={styles.roundSelector}>
        {rounds.map((round, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedRound(idx)}
            className={styles.roundTab}
            data-active={selectedRound === idx}
          >
            Round {idx + 1}
            <span className={styles.roundScore}>{round.rewardsCollected}/{N_REWARDS}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab('stats')}
          className={styles.tab}
          data-active={activeTab === 'stats'}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('replay')}
          className={styles.tab}
          data-active={activeTab === 'replay'}
        >
          Path Replay
        </button>
      </div>

      {activeTab === 'stats' && currentStats && (
        <div className={styles.statsContent}>
          {/* Final Path Screenshot Section */}
          <div className={styles.screenshotSection}>
            <h3 className={styles.sectionTitle}>Final Path Screenshot</h3>
            <div className={styles.screenshotWrapper}>
              <canvas
                ref={screenshotCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={styles.screenshotCanvas}
              />
            </div>
            <button onClick={handleDownloadScreenshot} className={styles.downloadButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Screenshot (PNG)
            </button>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{currentStats.rewardsCollected}/{N_REWARDS}</div>
              <div className={styles.statLabel}>Rewards Collected</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatDuration(currentStats.timeToFinish)}</div>
              <div className={styles.statLabel}>Time to Finish</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{currentStats.totalDistance.toFixed(0)} px</div>
              <div className={styles.statLabel}>Total Distance</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{currentStats.meanVelocity.toFixed(1)} px/s</div>
              <div className={styles.statLabel}>Mean Velocity</div>
            </div>
          </div>

          <div className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>Exploration Efficiency</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statName}>Path Efficiency</span>
                <span className={styles.statNumber}>{(currentStats.pathEfficiency * 100).toFixed(1)}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Coverage</span>
                <span className={styles.statNumber}>{currentStats.coveragePercent.toFixed(1)}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Revisit Rate</span>
                <span className={styles.statNumber}>{currentStats.revisitRate.toFixed(2)}x</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Max Velocity</span>
                <span className={styles.statNumber}>{currentStats.maxVelocity.toFixed(1)} px/s</span>
              </div>
            </div>
          </div>

          <div className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>Behavioral Patterns</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statName}>Pauses</span>
                <span className={styles.statNumber}>{currentStats.pausesCount}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Total Idle Time</span>
                <span className={styles.statNumber}>{(currentStats.totalIdleTime / 1000).toFixed(1)}s</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>First Reward</span>
                <span className={styles.statNumber}>{(currentStats.firstRewardLatency / 1000).toFixed(2)}s</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Avg Interval</span>
                <span className={styles.statNumber}>{(currentStats.meanInterRewardInterval / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>

          <div className={styles.statsSection}>
            <h3 className={styles.sectionTitle}>Spatial Distribution</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statName}>Edge Time</span>
                <span className={styles.statNumber}>{currentStats.edgeTimePercent.toFixed(1)}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statName}>Center Bias</span>
                <span className={styles.statNumber}>{currentStats.centerBias.toFixed(3)}</span>
              </div>
            </div>
            <div className={styles.quadrants}>
              <div className={styles.quadrant}>
                <span className={styles.quadrantLabel}>NW</span>
                <span className={styles.quadrantValue}>{currentStats.quadrantDistribution.NW.toFixed(1)}%</span>
              </div>
              <div className={styles.quadrant}>
                <span className={styles.quadrantLabel}>NE</span>
                <span className={styles.quadrantValue}>{currentStats.quadrantDistribution.NE.toFixed(1)}%</span>
              </div>
              <div className={styles.quadrant}>
                <span className={styles.quadrantLabel}>SW</span>
                <span className={styles.quadrantValue}>{currentStats.quadrantDistribution.SW.toFixed(1)}%</span>
              </div>
              <div className={styles.quadrant}>
                <span className={styles.quadrantLabel}>SE</span>
                <span className={styles.quadrantValue}>{currentStats.quadrantDistribution.SE.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'replay' && currentRound && (
        <PathReplay
          round={currentRound}
          movements={currentMovements}
          events={currentEvents}
        />
      )}
    </div>
  );
}

