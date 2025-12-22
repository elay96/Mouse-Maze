// Instructions Screen

import type { Condition } from '../../config/constants';
import { N_ROUNDS, N_REWARDS } from '../../config/constants';
import styles from './Instructions.module.css';

interface InstructionsProps {
  participantId: string;
  condition: Condition;
  onStart: () => void;
}

export function Instructions({ participantId, condition, onStart }: InstructionsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.participant}>
            <span className={styles.participantLabel}>Participant</span>
            <span className={styles.participantId}>{participantId}</span>
          </div>
          <div className={styles.conditionBadge} data-condition={condition}>
            Condition: {condition}
          </div>
        </div>

        <h1 className={styles.title}>How to Play</h1>

        <div className={styles.instructions}>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Explore the Canvas</h3>
              <p>Move your mouse cursor across the canvas area. Black dots indicate the environment pattern.</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Find Hidden Rewards</h3>
              <p>There are <strong>{N_REWARDS} hidden rewards</strong> on each canvas. You cannot see them until collected - you'll hear a sound and see a brief flash when your cursor finds one.</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Complete All Rounds</h3>
              <p>You will play <strong>{N_ROUNDS} rounds</strong>. Each round has a time limit of <strong>30 Seconds</strong>. Try to find as many rewards as possible!</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Audio Feedback</h3>
              <p>Make sure your audio is on! You'll hear a pleasant chime each time you collect a reward.</p>
            </div>
          </div>
        </div>

        <div className={styles.tips}>
          <div className={styles.tipHeader}>Tips</div>
          <ul>
            <li>Keep your mouse moving smoothly across the canvas</li>
            <li>Pay attention to the pattern of rewards you find</li>
            <li>Your goal is to maximize your score in each round</li>
          </ul>
        </div>

        <button onClick={onStart} className={styles.startButton}>
          Start Round 1
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

