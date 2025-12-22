// Export Utilities for JSON and CSV

import { saveAs } from 'file-saver';
import type { Session, Round, MovementSample, GameEvent, ExportData } from '../types/schema';
import { calculateRoundStats } from './statsCalculator';

// ============ JSON EXPORT ============

/**
 * Export full session data as JSON
 */
export function exportSessionJSON(
  session: Session,
  rounds: Round[],
  movements: MovementSample[],
  events: GameEvent[]
): void {
  const exportData: ExportData = {
    session,
    rounds: rounds.map(round => {
      const roundMovements = movements.filter(
        m => m.sessionId === session.sessionId && m.roundIndex === round.roundIndex
      );
      const roundEvents = events.filter(
        e => e.sessionId === session.sessionId && e.roundIndex === round.roundIndex
      );
      const stats = calculateRoundStats(
        session.sessionId,
        round.roundIndex,
        roundMovements,
        roundEvents,
        round.durationMs || 0,
        round.rewardsCollected
      );
      
      return {
        roundInfo: round,
        movements: roundMovements,
        events: roundEvents,
        stats
      };
    })
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const filename = `mouse-maze_${session.participantId}_${formatDateForFilename(session.startTimestamp)}.json`;
  saveAs(blob, filename);
}

// ============ CSV EXPORT ============

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends object>(data: T[], columns: (keyof T | string)[]): string {
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = (row as Record<string, unknown>)[col as string];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Export movements as CSV
 */
export function exportMovementsCSV(
  movements: MovementSample[],
  participantId: string,
  startTimestamp: string
): void {
  const columns = [
    'sessionId',
    'participantId', 
    'condition',
    'roundIndex',
    'timestampMs',
    'timestampAbs',
    'x',
    'y',
    'velocity',
    'distanceFromLast',
    'acceleration'
  ];
  
  const csv = arrayToCSV(movements, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const filename = `mouse-maze_movements_${participantId}_${formatDateForFilename(startTimestamp)}.csv`;
  saveAs(blob, filename);
}

/**
 * Export events as CSV
 */
export function exportEventsCSV(
  events: GameEvent[],
  participantId: string,
  startTimestamp: string
): void {
  // Flatten metadata for CSV
  const flatEvents = events.map(e => ({
    sessionId: e.sessionId,
    roundIndex: e.roundIndex,
    eventType: e.eventType,
    timestampMs: e.timestampMs,
    timestampAbs: e.timestampAbs,
    rewardIndex: e.metadata?.rewardIndex ?? '',
    rewardX: e.metadata?.rewardPosition?.x ?? '',
    rewardY: e.metadata?.rewardPosition?.y ?? '',
    totalRewardsCollected: e.metadata?.totalRewardsCollected ?? '',
    reason: e.metadata?.reason ?? ''
  }));
  
  const columns = [
    'sessionId',
    'roundIndex',
    'eventType',
    'timestampMs',
    'timestampAbs',
    'rewardIndex',
    'rewardX',
    'rewardY',
    'totalRewardsCollected',
    'reason'
  ];
  
  const csv = arrayToCSV(flatEvents, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const filename = `mouse-maze_events_${participantId}_${formatDateForFilename(startTimestamp)}.csv`;
  saveAs(blob, filename);
}

/**
 * Export round summaries as CSV
 */
export function exportRoundSummaryCSV(
  rounds: Round[],
  movements: MovementSample[],
  events: GameEvent[],
  participantId: string,
  startTimestamp: string
): void {
  const summaries = rounds.map(round => {
    const roundMovements = movements.filter(m => m.roundIndex === round.roundIndex);
    const roundEvents = events.filter(e => e.roundIndex === round.roundIndex);
    const stats = calculateRoundStats(
      round.sessionId,
      round.roundIndex,
      roundMovements,
      roundEvents,
      round.durationMs || 0,
      round.rewardsCollected
    );
    
    return {
      sessionId: round.sessionId,
      roundIndex: round.roundIndex,
      condition: round.condition,
      startTimestamp: round.startTimestamp,
      endTimestamp: round.endTimestamp || '',
      durationMs: round.durationMs || 0,
      rewardsCollected: round.rewardsCollected,
      endReason: round.endReason || '',
      totalDistance: stats.totalDistance.toFixed(2),
      meanVelocity: stats.meanVelocity.toFixed(2),
      maxVelocity: stats.maxVelocity.toFixed(2),
      pathEfficiency: stats.pathEfficiency.toFixed(4),
      coveragePercent: stats.coveragePercent.toFixed(2),
      revisitRate: stats.revisitRate.toFixed(2),
      pausesCount: stats.pausesCount,
      totalIdleTime: stats.totalIdleTime,
      firstRewardLatency: stats.firstRewardLatency,
      meanInterRewardInterval: stats.meanInterRewardInterval.toFixed(2),
      edgeTimePercent: stats.edgeTimePercent.toFixed(2),
      centerBias: stats.centerBias.toFixed(4)
    };
  });
  
  const columns = [
    'sessionId',
    'roundIndex',
    'condition',
    'startTimestamp',
    'endTimestamp',
    'durationMs',
    'rewardsCollected',
    'endReason',
    'totalDistance',
    'meanVelocity',
    'maxVelocity',
    'pathEfficiency',
    'coveragePercent',
    'revisitRate',
    'pausesCount',
    'totalIdleTime',
    'firstRewardLatency',
    'meanInterRewardInterval',
    'edgeTimePercent',
    'centerBias'
  ];
  
  const csv = arrayToCSV(summaries, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const filename = `mouse-maze_rounds_${participantId}_${formatDateForFilename(startTimestamp)}.csv`;
  saveAs(blob, filename);
}

/**
 * Export all sessions summary (admin)
 */
export function exportAllSessionsCSV(sessions: Session[]): void {
  const columns = [
    'sessionId',
    'participantId',
    'condition',
    'startTimestamp',
    'endTimestamp',
    'roundsCompleted',
    'status'
  ];
  
  const csv = arrayToCSV(sessions, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const filename = `mouse-maze_all_sessions_${formatDateForFilename(new Date().toISOString())}.csv`;
  saveAs(blob, filename);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format ISO timestamp for filename
 */
function formatDateForFilename(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

