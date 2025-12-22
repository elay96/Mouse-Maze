// Admin Login Screen

import { useState, useCallback } from 'react';
import { ADMIN_PASSCODE } from '../../config/constants';
import styles from './AdminLogin.module.css';

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate a brief delay for security
    await new Promise(resolve => setTimeout(resolve, 300));

    if (passcode === ADMIN_PASSCODE) {
      sessionStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setError('Invalid passcode');
      setPasscode('');
    }

    setIsLoading(false);
  }, [passcode, onLogin]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button onClick={onBack} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Study
        </button>

        <div className={styles.header}>
          <div className={styles.icon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className={styles.title}>Researcher Access</h1>
          <p className={styles.subtitle}>Researcher Access (Passcode)</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className={styles.input}
              autoComplete="off"
              autoFocus
            />
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
            disabled={!passcode || isLoading}
          >
            {isLoading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        <p className={styles.note}>
          This area is for researchers only. Contact the study administrator if you need access.
        </p>
      </div>
    </div>
  );
}

