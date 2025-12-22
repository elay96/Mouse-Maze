// Round Transition Screen - Clean pause screen with no UI elements

import { useEffect } from 'react';
import type { Round } from '../../types/schema';
import { INTER_ROUND_DELAY } from '../../config/constants';
import styles from './RoundTransition.module.css';

interface RoundTransitionProps {
  completedRound: Round;
  nextRoundIndex: number;
  isLastRound: boolean;
  onContinue: () => void;
}

export function RoundTransition({
  onContinue
}: RoundTransitionProps) {
  // Auto-transition after pause delay (10 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, INTER_ROUND_DELAY);

    return () => clearTimeout(timer);
  }, [onContinue]);

  // Clean empty pause screen - no buttons, no animations, no UI elements
  return (
    <div className={styles.pauseScreen} />
  );
}

