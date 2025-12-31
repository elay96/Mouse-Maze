// Modal Component - Blocking dialog with OK/Halt buttons
// Used for pre-foraging instructions and end-of-level feedback

import { useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: React.ReactNode;
  onOk: () => void;
  onHalt?: () => void;
  okText?: string;
  haltText?: string;
  showHalt?: boolean;
  icon?: 'info' | 'success' | 'warning';
}

export function Modal({
  isOpen,
  title,
  children,
  onOk,
  onHalt,
  okText = 'OK',
  haltText = 'Halt',
  showHalt = true,
  icon = 'info'
}: ModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      onOk();
    } else if (e.key === 'Escape' && showHalt && onHalt) {
      e.preventDefault();
      onHalt();
    }
  }, [isOpen, onOk, onHalt, showHalt]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (icon) {
      case 'info':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconInfo}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        );
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSuccess}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconWarning}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconContainer}>
          {renderIcon()}
        </div>
        
        {title && <h2 className={styles.title}>{title}</h2>}
        
        <div className={styles.content}>
          {children}
        </div>
        
        <div className={styles.buttons}>
          <button 
            onClick={onOk} 
            className={styles.okButton}
            autoFocus
          >
            {okText}
          </button>
          
          {showHalt && onHalt && (
            <button 
              onClick={onHalt} 
              className={styles.haltButton}
            >
              {haltText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

