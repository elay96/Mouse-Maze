// Landing Screen - Consent and Participant Info

import { useState, useCallback } from 'react';
import type { Gender } from '../../types/schema';
import { stableHash } from '../../utils/hash';
import styles from './Landing.module.css';

export interface ParticipantInfo {
  fullName: string;
  age: number;
  gender: Gender;
  participantKey: string;
}

interface LandingProps {
  onStart: (info: ParticipantInfo) => void;
}

const CONSENT_TEXT = `
This research study investigates spatial exploration strategies. You will complete a series of rounds 
where you explore a canvas with your mouse to find hidden rewards.

During the study:
• Your mouse movements will be recorded
• You will hear audio feedback when you find rewards
• The study consists of 5 rounds, each lasting up to 2 minutes
• Total estimated time: 10-15 minutes

Your data will be stored locally in your browser and will not be transmitted to any external servers.

By checking the box below, you confirm that you understand the nature of this study and consent to participate.
`;

export function Landing({ onStart }: LandingProps) {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Please enter your full name');
      return false;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 99) {
      setError('Please enter a valid age (10-99)');
      return false;
    }

    if (!gender) {
      setError('Please select your gender');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasConsent) {
      setError('Please provide consent to continue');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const trimmedName = fullName.trim();
    const ageNum = parseInt(age, 10);
    const participantKey = stableHash(
      trimmedName.toLowerCase() + '|' + ageNum + '|' + gender
    );

    onStart({
      fullName: trimmedName,
      age: ageNum,
      gender: gender as Gender,
      participantKey
    });
  }, [fullName, age, gender, hasConsent, onStart]);

  const clearError = () => {
    if (error) setError(null);
  };

  const ageNum = parseInt(age, 10);
  const canSubmit = hasConsent && 
    fullName.trim().length > 0 && 
    !isNaN(ageNum) && ageNum >= 10 && ageNum <= 99 && 
    (gender === 'male' || gender === 'female' || gender === 'other');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 40 40" className={styles.logo}>
              <circle cx="12" cy="14" r="4" fill="currentColor" opacity="0.8" />
              <circle cx="28" cy="26" r="4" fill="currentColor" opacity="0.8" />
              <circle cx="20" cy="20" r="3" fill="#ffd700" />
              <path d="M12 14 Q16 18 20 20 Q24 22 28 26" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2" opacity="0.5" />
            </svg>
          </div>
          <h1 className={styles.title}>Mouse Maze</h1>
          <p className={styles.subtitle}>Spatial Exploration Study</p>
        </div>

        <div className={styles.consentSection}>
          <h2 className={styles.sectionTitle}>Research Consent</h2>
          <div className={styles.consentText}>
            {CONSENT_TEXT.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          
          <label className={styles.consentCheckbox}>
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
            />
            <span className={styles.checkboxCustom}>
              {hasConsent && (
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
              )}
            </span>
            <span>I understand and consent to participate in this study</span>
          </label>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="fullName" className={styles.label}>
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearError(); }}
              placeholder="Enter your full name"
              className={styles.input}
              autoComplete="name"
            />
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="age" className={styles.label}>
                Age
              </label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => { setAge(e.target.value); clearError(); }}
                placeholder="Age"
                className={styles.input}
                min={10}
                max={99}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Gender
              </label>
              <div className={styles.genderButtons}>
                <button
                  type="button"
                  className={styles.genderButton}
                  data-selected={gender === 'male'}
                  onClick={() => { setGender('male'); clearError(); }}
                >
                  Male
                </button>
                <button
                  type="button"
                  className={styles.genderButton}
                  data-selected={gender === 'female'}
                  onClick={() => { setGender('female'); clearError(); }}
                >
                  Female
                </button>
                <button
                  type="button"
                  className={styles.genderButton}
                  data-selected={gender === 'other'}
                  onClick={() => { setGender('other'); clearError(); }}
                >
                  Other
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={!canSubmit}
          >
            Begin Study
          </button>
        </form>

        <div className={styles.footer}>
          <span className={styles.adminLink}>
            <a href="/admin">Researcher Access</a>
          </span>
        </div>
      </div>
    </div>
  );
}
