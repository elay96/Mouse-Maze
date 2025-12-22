// Completion Screen - Session Summary and Export

import { useMemo } from 'react';
import type { Session, Round, MovementSample, GameEvent } from '../../types/schema';
import { N_REWARDS } from '../../config/constants';
import { exportSessionJSON, exportMovementsCSV, exportEventsCSV, exportRoundSummaryCSV } from '../../utils/exportUtils';
import styles from './Completion.module.css';

interface CompletionProps {
  session: Session;
  rounds: Round[];
  movements: MovementSample[];
  events: GameEvent[];
  onFinish: () => void;
}

export function Completion({ session, rounds, movements, events, onFinish }: CompletionProps) {
  const stats = useMemo(() => {
    const totalRewards = rounds.reduce((sum, r) => sum + r.rewardsCollected, 0);
    const totalTime = rounds.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    const avgRewards = rounds.length > 0 ? totalRewards / rounds.length : 0;
    const completedRounds = rounds.filter(r => r.endReason === 'all_rewards').length;
    const maxRewards = N_REWARDS * rounds.length;
    
    return {
      totalRewards,
      maxRewards,
      totalTime,
      avgRewards,
      completedRounds,
      roundsPlayed: rounds.length
    };
  }, [rounds]);

  const handleExportJSON = () => {
    exportSessionJSON(session, rounds, movements, events);
  };

  const handleExportCSV = () => {
    exportMovementsCSV(movements, session.participantId, session.startTimestamp);
    exportEventsCSV(events, session.participantId, session.startTimestamp);
    exportRoundSummaryCSV(rounds, movements, events, session.participantId, session.startTimestamp);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.celebrationIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h1 className={styles.title}>Study Complete!</h1>
          <p className={styles.subtitle}>Thank you for participating</p>
        </div>

        <div className={styles.summary}>
          <div className={styles.participantInfo}>
            <span className={styles.label}>Participant ID</span>
            <span className={styles.value}>{session.participantId}</span>
          </div>
          <div className={styles.participantInfo}>
            <span className={styles.label}>Condition</span>
            <span className={styles.value} data-condition={session.condition}>{session.condition}</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.mainStat}>
            <div className={styles.statNumber}>{stats.totalRewards}</div>
            <div className={styles.statMax}>/ {stats.maxRewards}</div>
            <div className={styles.statLabel}>Total Rewards</div>
          </div>

          <div className={styles.secondaryStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.roundsPlayed}</span>
              <span className={styles.statLabel}>Rounds Played</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.avgRewards.toFixed(1)}</span>
              <span className={styles.statLabel}>Avg per Round</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.completedRounds}</span>
              <span className={styles.statLabel}>Perfect Rounds</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatTime(stats.totalTime)}</span>
              <span className={styles.statLabel}>Total Time</span>
            </div>
          </div>
        </div>

        <div className={styles.roundBreakdown}>
          <h2 className={styles.sectionTitle}>Round Breakdown</h2>
          <div className={styles.roundsList}>
            {rounds.map((round, idx) => (
              <div key={idx} className={styles.roundItem}>
                <span className={styles.roundNumber}>R{idx + 1}</span>
                <div className={styles.roundBar}>
                  <div 
                    className={styles.roundBarFill}
                    style={{ width: `${(round.rewardsCollected / N_REWARDS) * 100}%` }}
                    data-complete={round.endReason === 'all_rewards'}
                  />
                </div>
                <span className={styles.roundScore}>{round.rewardsCollected}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.exportSection}>
          <h2 className={styles.sectionTitle}>Export Your Data</h2>
          <p className={styles.exportDescription}>
            Download your session data for your records. Your data is stored locally and not transmitted anywhere.
          </p>
          <div className={styles.exportButtons}>
            <button onClick={handleExportJSON} className={styles.exportButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download JSON
            </button>
            <button onClick={handleExportCSV} className={styles.exportButton} data-variant="secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download CSV Files
            </button>
          </div>
        </div>

        <button onClick={onFinish} className={styles.finishButton}>
          Finish and Exit
        </button>

        <p className={styles.footer}>
          Your participation helps advance behavioral research. Thank you!
        </p>
      </div>
    </div>
  );
}

