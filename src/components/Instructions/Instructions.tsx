// Instructions Screen - NetLogo Spatial Foraging Adaptation

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
            {condition}
          </div>
        </div>

        <h1 className={styles.title}>Spatial Foraging Task</h1>
        <p className={styles.subtitle}>Learn to navigate and collect hidden resources</p>

        <div className={styles.phases}>
          <div className={styles.phase}>
            <div className={styles.phaseNumber}>1</div>
            <div className={styles.phaseContent}>
              <h3>Training Phase</h3>
              <p>First, you'll practice navigating through a maze to reach a target.</p>
            </div>
          </div>
          <div className={styles.phase}>
            <div className={styles.phaseNumber}>2</div>
            <div className={styles.phaseContent}>
              <h3>Foraging Phase</h3>
              <p>Then, complete {N_ROUNDS} rounds of collecting hidden resources.</p>
            </div>
          </div>
        </div>

        <div className={styles.controlsSection}>
          <h2 className={styles.controlsTitle}>Keyboard Controls</h2>
          <p className={styles.controlsSubtitle}>Your agent moves forward automatically. Use these keys to steer:</p>
          
          <div className={styles.controls}>
            <div className={styles.keyGroup}>
              <div className={styles.key}>
                <span className={styles.keyLabel}>A</span>
              </div>
              <span className={styles.keyOr}>or</span>
              <div className={styles.key}>
                <span className={styles.keyLabel}>←</span>
              </div>
              <span className={styles.keyAction}>Turn Left</span>
            </div>
            <div className={styles.agentPreview}>
              <svg viewBox="0 0 40 40" className={styles.agentIcon}>
                <polygon points="20,5 10,35 30,35" fill="#ffd700" />
              </svg>
            </div>
            <div className={styles.keyGroup}>
              <div className={styles.key}>
                <span className={styles.keyLabel}>D</span>
              </div>
              <span className={styles.keyOr}>or</span>
              <div className={styles.key}>
                <span className={styles.keyLabel}>→</span>
              </div>
              <span className={styles.keyAction}>Turn Right</span>
            </div>
          </div>
        </div>

        <div className={styles.instructions}>
          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 22,20 2,20" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Control Your Agent</h3>
              <p>You control a <strong>yellow triangle</strong> that moves forward automatically. Press <strong>A</strong> or <strong>←</strong> to turn left and <strong>D</strong> or <strong>→</strong> to turn right.</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" fill="#0066ff" stroke="none" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Collect Resources</h3>
              <p>There are <strong>{N_REWARDS} hidden resources</strong> on each map. When you collect one, it turns <strong style={{ color: '#0066ff' }}>blue</strong> and you hear a sound.</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" fill="#ef4444" stroke="none" />
              </svg>
            </div>
            <div className={styles.stepContent}>
              <h3>Training: Reach the Target</h3>
              <p>In training, navigate to the <strong style={{ color: '#ef4444' }}>red target</strong>. Avoid <strong style={{ color: '#0066ff' }}>blue walls</strong> - hitting one resets you to start!</p>
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
              <h3>Timed Rounds</h3>
              <p>Each foraging round has a <strong>60 second</strong> time limit. Collect as many resources as possible!</p>
            </div>
          </div>
        </div>

        <div className={styles.tips}>
          <div className={styles.tipHeader}>Tips</div>
          <ul>
            <li>The agent wraps around screen edges during foraging</li>
            <li>Listen for audio cues when collecting resources</li>
            <li>Pay attention to patterns in resource distribution</li>
            <li>Your score persists - maximize collection each round!</li>
          </ul>
        </div>

        <button onClick={onStart} className={styles.startButton}>
          Begin Training
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
