// IndexedDB Setup using Dexie

import Dexie, { type Table } from 'dexie';
import type { Session, Round, MovementSample, GameEvent, ParticipantProfile } from '../types/schema';

export class MouseMazeDB extends Dexie {
  sessions!: Table<Session, string>;
  rounds!: Table<Round, [string, number]>;
  movements!: Table<MovementSample, number>;
  events!: Table<GameEvent, number>;
  participants!: Table<ParticipantProfile, string>;

  constructor() {
    super('MouseMazeDB');
    
    // Version 1: Original schema
    this.version(1).stores({
      sessions: 'sessionId, participantId, condition, startTimestamp, status',
      rounds: '[sessionId+roundIndex], sessionId, condition',
      movements: '++id, sessionId, roundIndex, [sessionId+roundIndex]',
      events: '++id, sessionId, roundIndex, eventType, [sessionId+roundIndex]'
    });

    // Version 2: Add participants table for profile persistence
    this.version(2).stores({
      sessions: 'sessionId, participantId, condition, startTimestamp, status, fullName',
      rounds: '[sessionId+roundIndex], sessionId, condition',
      movements: '++id, sessionId, roundIndex, [sessionId+roundIndex]',
      events: '++id, sessionId, roundIndex, eventType, [sessionId+roundIndex]',
      participants: 'participantKey, fullName, assignedCondition, createdAt'
    });

    // Version 3: NetLogo adaptation - add mazeCompleted to sessions, heading/foodHere to movements
    this.version(3).stores({
      sessions: 'sessionId, participantId, condition, startTimestamp, status, fullName, mazeCompleted',
      rounds: '[sessionId+roundIndex], sessionId, condition',
      movements: '++id, sessionId, roundIndex, [sessionId+roundIndex], heading',
      events: '++id, sessionId, roundIndex, eventType, [sessionId+roundIndex]',
      participants: 'participantKey, fullName, assignedCondition, createdAt'
    });
  }
}

export const db = new MouseMazeDB();

// ============ SESSION OPERATIONS ============

export async function createSession(session: Session): Promise<void> {
  await db.sessions.add(session);
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  await db.sessions.update(sessionId, updates);
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  return db.sessions.get(sessionId);
}

export async function getSessionByParticipant(participantId: string): Promise<Session | undefined> {
  return db.sessions.where('participantId').equals(participantId).first();
}

export async function getAllSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startTimestamp').reverse().toArray();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.rounds, db.movements, db.events], async () => {
    await db.events.where('sessionId').equals(sessionId).delete();
    await db.movements.where('sessionId').equals(sessionId).delete();
    await db.rounds.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

// ============ ROUND OPERATIONS ============

export async function saveRound(round: Round): Promise<void> {
  await db.rounds.put(round);
}

export async function getRound(sessionId: string, roundIndex: number): Promise<Round | undefined> {
  return db.rounds.get([sessionId, roundIndex]);
}

export async function getRoundsForSession(sessionId: string): Promise<Round[]> {
  return db.rounds.where('sessionId').equals(sessionId).toArray();
}

// ============ MOVEMENT OPERATIONS ============

export async function saveMovementBatch(movements: MovementSample[]): Promise<void> {
  await db.movements.bulkAdd(movements);
}

export async function getMovementsForRound(sessionId: string, roundIndex: number): Promise<MovementSample[]> {
  return db.movements
    .where('[sessionId+roundIndex]')
    .equals([sessionId, roundIndex])
    .toArray();
}

export async function getMovementsForSession(sessionId: string): Promise<MovementSample[]> {
  return db.movements.where('sessionId').equals(sessionId).toArray();
}

// ============ EVENT OPERATIONS ============

export async function saveEvent(event: GameEvent): Promise<void> {
  await db.events.add(event);
}

export async function saveEventBatch(events: GameEvent[]): Promise<void> {
  await db.events.bulkAdd(events);
}

export async function getEventsForRound(sessionId: string, roundIndex: number): Promise<GameEvent[]> {
  return db.events
    .where('[sessionId+roundIndex]')
    .equals([sessionId, roundIndex])
    .toArray();
}

export async function getEventsForSession(sessionId: string): Promise<GameEvent[]> {
  return db.events.where('sessionId').equals(sessionId).toArray();
}

// ============ BULK DATA RETRIEVAL ============

export async function getFullSessionData(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const rounds = await getRoundsForSession(sessionId);
  const movements = await getMovementsForSession(sessionId);
  const events = await getEventsForSession(sessionId);

  return { session, rounds, movements, events };
}

// ============ DATABASE UTILITIES ============

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.sessions, db.rounds, db.movements, db.events], async () => {
    await db.events.clear();
    await db.movements.clear();
    await db.rounds.clear();
    await db.sessions.clear();
  });
}

export async function getDatabaseSize(): Promise<{ sessions: number; rounds: number; movements: number; events: number }> {
  const [sessions, rounds, movements, events] = await Promise.all([
    db.sessions.count(),
    db.rounds.count(),
    db.movements.count(),
    db.events.count()
  ]);
  return { sessions, rounds, movements, events };
}

// ============ PARTICIPANT PROFILE OPERATIONS ============

export async function saveParticipantProfile(profile: ParticipantProfile): Promise<void> {
  await db.participants.put(profile);
}

export async function getParticipantProfile(participantKey: string): Promise<ParticipantProfile | undefined> {
  return db.participants.get(participantKey);
}

