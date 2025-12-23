// Admin Dashboard - Session List

import { useState, useEffect, useMemo } from 'react';
import type { Session } from '../../types/schema';
import { hasParticipantProfile } from '../../types/schema';
import type { Condition } from '../../config/constants';
import { isSupabaseConfigured, testSupabaseConnection } from '../../config/supabase';
import { cloudGetAllSessions, cloudDeleteSession } from '../../utils/cloudDatabase';
import { getAllSessions, deleteSession } from '../../utils/database';
import { exportAllSessionsCSV } from '../../utils/exportUtils';
import styles from './AdminDashboard.module.css';

interface AdminDashboardProps {
  onSelectSession: (sessionId: string) => void;
  onLogout: () => void;
}

export function AdminDashboard({ onSelectSession, onLogout }: AdminDashboardProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<Condition | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'participant' | 'rewards'>('date');
  const [dataSource, setDataSource] = useState<'cloud' | 'local'>('cloud');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleTestConnection = async () => {
    setDebugInfo('Testing connection...');
    const result = await testSupabaseConnection();
    if (result.success) {
      setDebugInfo('✅ Connection successful! Supabase is working.');
    } else {
      setDebugInfo(`❌ Connection failed: ${result.error}`);
    }
  };

  const loadSessions = async () => {
    setIsLoading(true);
    
    const isConfigured = isSupabaseConfigured();
    console.log('[AdminDashboard] Supabase configured:', isConfigured);
    
    // Try cloud first if configured
    if (isConfigured) {
      console.log('[AdminDashboard] Trying to fetch from cloud...');
      const cloudSessions = await cloudGetAllSessions();
      console.log('[AdminDashboard] Cloud sessions received:', cloudSessions.length);
      
      // Even if empty, if Supabase is configured, use cloud as source
      setSessions(cloudSessions);
      setDataSource('cloud');
      setIsLoading(false);
      return;
    }
    
    // Fallback to local IndexedDB
    console.log('[AdminDashboard] Falling back to local IndexedDB');
    const localSessions = await getAllSessions();
    setSessions(localSessions);
    setDataSource('local');
    setIsLoading(false);
  };

  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Search filter - matches fullName, participantId (key), or legacy id
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.participantId.toLowerCase().includes(query) ||
        s.sessionId.toLowerCase().includes(query) ||
        (s.fullName && s.fullName.toLowerCase().includes(query))
      );
    }

    // Condition filter
    if (conditionFilter !== 'ALL') {
      result = result.filter(s => s.condition === conditionFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime();
        case 'participant':
          // Sort by fullName if available, otherwise participantId
          const aName = a.fullName || a.participantId;
          const bName = b.fullName || b.participantId;
          return aName.localeCompare(bName);
        case 'rewards':
          return b.roundsCompleted - a.roundsCompleted;
        default:
          return 0;
      }
    });

    return result;
  }, [sessions, searchQuery, conditionFilter, sortBy]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this session? This cannot be undone.')) {
      // Delete from both cloud and local
      if (isSupabaseConfigured()) {
        await cloudDeleteSession(sessionId);
      }
      await deleteSession(sessionId);
      await loadSessions();
    }
  };

  const handleExportAll = () => {
    exportAllSessionsCSV(sessions);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    onLogout();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = useMemo(() => {
    const total = sessions.length;
    const cluster = sessions.filter(s => s.condition === 'CLUSTER').length;
    const noise = sessions.filter(s => s.condition === 'NOISE').length;
    const complete = sessions.filter(s => s.status === 'complete').length;
    return { total, cluster, noise, complete };
  }, [sessions]);

  // Helper to display participant info
  const getParticipantDisplay = (session: Session) => {
    if (hasParticipantProfile(session)) {
      return {
        primary: session.fullName!,
        secondary: `${session.age} / ${session.gender === 'male' ? 'M' : 'F'}`,
        isLegacy: false
      };
    }
    return {
      primary: session.participantId,
      secondary: 'Legacy ID',
      isLegacy: true
    };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <span className={styles.subtitle}>Mouse Maze Research Data</span>
        </div>
        <div className={styles.headerRight}>
          <button onClick={handleExportAll} className={styles.exportAllButton}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export All
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total Sessions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} data-condition="CLUSTER">{stats.cluster}</span>
          <span className={styles.statLabel}>Cluster</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} data-condition="NOISE">{stats.noise}</span>
          <span className={styles.statLabel}>Noise</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} data-status="complete">{stats.complete}</span>
          <span className={styles.statLabel}>Complete</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} data-source={dataSource}>
            {dataSource === 'cloud' ? '☁️' : '💾'}
          </span>
          <span className={styles.statLabel}>{dataSource === 'cloud' ? 'Cloud DB' : 'Local DB'}</span>
        </div>
        <div className={styles.stat} style={{ cursor: 'pointer' }} onClick={() => setShowDebug(!showDebug)}>
          <span className={styles.statValue}>🔧</span>
          <span className={styles.statLabel}>Debug</span>
        </div>
      </div>

      {showDebug && (
        <div style={{ 
          background: '#1a1a2e', 
          border: '1px solid #333', 
          borderRadius: '8px', 
          padding: '16px', 
          margin: '16px 0',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#58a6ff' }}>🔧 Debug Panel</h3>
          <div style={{ marginBottom: '12px' }}>
            <strong>Supabase Configured:</strong> {isSupabaseConfigured() ? '✅ Yes' : '❌ No'}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <strong>Data Source:</strong> {dataSource === 'cloud' ? '☁️ Cloud' : '💾 Local'}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <strong>Sessions Loaded:</strong> {sessions.length}
          </div>
          <button 
            onClick={handleTestConnection}
            style={{
              background: '#238636',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            Test Supabase Connection
          </button>
          <button 
            onClick={loadSessions}
            style={{
              background: '#1f6feb',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Sessions
          </button>
          {debugInfo && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              background: '#0d1117', 
              borderRadius: '4px',
              whiteSpace: 'pre-wrap'
            }}>
              {debugInfo}
            </div>
          )}
          <div style={{ marginTop: '12px', color: '#8b949e', fontSize: '12px' }}>
            💡 Open browser console (F12) for detailed logs
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <select 
            value={conditionFilter} 
            onChange={(e) => setConditionFilter(e.target.value as Condition | 'ALL')}
            className={styles.select}
          >
            <option value="ALL">All Conditions</option>
            <option value="CLUSTER">Cluster</option>
            <option value="NOISE">Noise</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'date' | 'participant' | 'rewards')}
            className={styles.select}
          >
            <option value="date">Sort by Date</option>
            <option value="participant">Sort by Participant</option>
            <option value="rewards">Sort by Rounds</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.loading}>Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className={styles.empty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6M12 9v6M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            <p>No sessions found</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Age / Gender</th>
                <th>Condition</th>
                <th>Date</th>
                <th>Rounds</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map(session => {
                const display = getParticipantDisplay(session);
                return (
                  <tr 
                    key={session.sessionId}
                    onClick={() => onSelectSession(session.sessionId)}
                    className={styles.row}
                  >
                    <td className={styles.participantCell}>
                      <div className={styles.participantInfo}>
                        <span className={styles.participantName}>{display.primary}</span>
                        {display.isLegacy && (
                          <span className={styles.legacyBadge}>legacy</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.ageGenderCell}>
                      {display.isLegacy ? (
                        <span className={styles.naText}>—</span>
                      ) : (
                        <span>{session.age} / {session.gender === 'male' ? 'M' : session.gender === 'female' ? 'F' : 'O'}</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.conditionBadge} data-condition={session.condition}>
                        {session.condition}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {formatDate(session.startTimestamp)}
                    </td>
                    <td className={styles.roundsCell}>
                      {session.roundsCompleted}
                    </td>
                    <td>
                      <span className={styles.statusBadge} data-status={session.status}>
                        {session.status}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={(e) => handleDelete(session.sessionId, e)}
                        className={styles.deleteButton}
                        title="Delete session"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
