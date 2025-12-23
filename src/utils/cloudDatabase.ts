// Cloud Database Service - Supabase Integration
// This syncs session data to Supabase for centralized storage

import { supabase, isSupabaseConfigured } from '../config/supabase';
import type { Session, Round, MovementSample, GameEvent } from '../types/schema';
import type { DbSession, DbRound, DbMovement, DbEvent } from '../config/supabase';

// ============ CONVERSION HELPERS ============

function sessionToDb(session: Session): DbSession {
  return {
    session_id: session.sessionId,
    participant_id: session.participantId,
    condition: session.condition,
    start_timestamp: session.startTimestamp,
    end_timestamp: session.endTimestamp || null,
    rounds_completed: session.roundsCompleted,
    status: session.status,
    consent_timestamp: session.consentTimestamp,
    config: session.config,
    full_name: session.fullName || null,
    age: session.age || null,
    gender: session.gender || null,
  };
}

function dbToSession(db: DbSession): Session {
  return {
    sessionId: db.session_id,
    participantId: db.participant_id,
    condition: db.condition as Session['condition'],
    startTimestamp: db.start_timestamp,
    endTimestamp: db.end_timestamp || undefined,
    roundsCompleted: db.rounds_completed,
    status: db.status as Session['status'],
    consentTimestamp: db.consent_timestamp,
    config: db.config as Session['config'],
    fullName: db.full_name || undefined,
    age: db.age || undefined,
    gender: db.gender as Session['gender'],
  };
}

function roundToDb(round: Round): DbRound {
  return {
    session_id: round.sessionId,
    round_index: round.roundIndex,
    condition: round.condition,
    start_timestamp: round.startTimestamp,
    end_timestamp: round.endTimestamp || null,
    duration_ms: round.durationMs || null,
    rewards_collected: round.rewardsCollected,
    black_pixel_positions: round.blackPixelPositions,
    reward_positions: round.rewardPositions,
    cluster_params: round.clusterParams || null,
    end_reason: round.endReason || null,
  };
}

function dbToRound(db: DbRound): Round {
  return {
    sessionId: db.session_id,
    roundIndex: db.round_index,
    condition: db.condition as Round['condition'],
    startTimestamp: db.start_timestamp,
    endTimestamp: db.end_timestamp || undefined,
    durationMs: db.duration_ms || undefined,
    rewardsCollected: db.rewards_collected,
    blackPixelPositions: db.black_pixel_positions as Round['blackPixelPositions'],
    rewardPositions: db.reward_positions as Round['rewardPositions'],
    clusterParams: db.cluster_params as Round['clusterParams'],
    endReason: db.end_reason as Round['endReason'],
  };
}

function movementToDb(movement: MovementSample): DbMovement {
  return {
    session_id: movement.sessionId,
    participant_id: movement.participantId,
    condition: movement.condition,
    round_index: movement.roundIndex,
    timestamp_ms: movement.timestampMs,
    timestamp_abs: movement.timestampAbs,
    x: movement.x,
    y: movement.y,
    velocity: movement.velocity,
    distance_from_last: movement.distanceFromLast,
    acceleration: movement.acceleration,
  };
}

function dbToMovement(db: DbMovement): MovementSample {
  return {
    id: db.id,
    sessionId: db.session_id,
    participantId: db.participant_id,
    condition: db.condition as MovementSample['condition'],
    roundIndex: db.round_index,
    timestampMs: db.timestamp_ms,
    timestampAbs: db.timestamp_abs,
    x: db.x,
    y: db.y,
    velocity: db.velocity,
    distanceFromLast: db.distance_from_last,
    acceleration: db.acceleration,
  };
}

function eventToDb(event: GameEvent): DbEvent {
  return {
    session_id: event.sessionId,
    round_index: event.roundIndex,
    event_type: event.eventType,
    timestamp_ms: event.timestampMs,
    timestamp_abs: event.timestampAbs,
    metadata: event.metadata || null,
  };
}

function dbToEvent(db: DbEvent): GameEvent {
  return {
    id: db.id,
    sessionId: db.session_id,
    roundIndex: db.round_index,
    eventType: db.event_type as GameEvent['eventType'],
    timestampMs: db.timestamp_ms,
    timestampAbs: db.timestamp_abs,
    metadata: db.metadata as GameEvent['metadata'],
  };
}

// ============ SESSION OPERATIONS ============

export async function cloudCreateSession(session: Session): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.warn('[Cloud] Supabase not configured, skipping cloud sync');
    return false;
  }

  console.log('[Cloud] Creating session:', session.sessionId);
  
  try {
    const dbSession = sessionToDb(session);
    console.log('[Cloud] Session data to insert:', dbSession);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert(dbSession)
      .select();

    if (error) {
      console.error('[Cloud] ❌ Error creating session:', error.message, error.details, error.hint);
      return false;
    }
    
    console.log('[Cloud] ✅ Session created successfully:', data);
    return true;
  } catch (err) {
    console.error('[Cloud] ❌ Exception creating session:', err);
    return false;
  }
}

export async function cloudUpdateSession(sessionId: string, updates: Partial<Session>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  console.log('[Cloud] Updating session:', sessionId, updates);
  
  try {
    const dbUpdates: Partial<DbSession> = {};
    if (updates.roundsCompleted !== undefined) dbUpdates.rounds_completed = updates.roundsCompleted;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.endTimestamp !== undefined) dbUpdates.end_timestamp = updates.endTimestamp;

    const { data, error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('session_id', sessionId)
      .select();

    if (error) {
      console.error('[Cloud] ❌ Error updating session:', error.message);
      return false;
    }
    console.log('[Cloud] ✅ Session updated:', data);
    return true;
  } catch (err) {
    console.error('[Cloud] ❌ Exception updating session:', err);
    return false;
  }
}

export async function cloudGetSession(sessionId: string): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) return null;
    return dbToSession(data);
  } catch (err) {
    console.error('Cloud fetch error:', err);
    return null;
  }
}

export async function cloudGetAllSessions(): Promise<Session[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching sessions from cloud:', error);
      return [];
    }

    return (data || []).map(dbToSession);
  } catch (err) {
    console.error('Cloud fetch error:', err);
    return [];
  }
}

export async function cloudDeleteSession(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // Delete in order: events, movements, rounds, then session
    await supabase.from('events').delete().eq('session_id', sessionId);
    await supabase.from('movements').delete().eq('session_id', sessionId);
    await supabase.from('rounds').delete().eq('session_id', sessionId);
    
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting session from cloud:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Cloud delete error:', err);
    return false;
  }
}

// ============ ROUND OPERATIONS ============

export async function cloudSaveRound(round: Round): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  console.log('[Cloud] Saving round:', round.sessionId, 'round', round.roundIndex);
  
  try {
    const { data, error } = await supabase
      .from('rounds')
      .upsert(roundToDb(round), { onConflict: 'session_id,round_index' })
      .select();

    if (error) {
      console.error('[Cloud] ❌ Error saving round:', error.message, error.details);
      return false;
    }
    console.log('[Cloud] ✅ Round saved:', data);
    return true;
  } catch (err) {
    console.error('[Cloud] ❌ Exception saving round:', err);
    return false;
  }
}

export async function cloudGetRoundsForSession(sessionId: string): Promise<Round[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_index');

    if (error) {
      console.error('Error fetching rounds from cloud:', error);
      return [];
    }

    return (data || []).map(dbToRound);
  } catch (err) {
    console.error('Cloud fetch error:', err);
    return [];
  }
}

// ============ MOVEMENT OPERATIONS ============

export async function cloudSaveMovementBatch(movements: MovementSample[]): Promise<boolean> {
  console.log('[Cloud] cloudSaveMovementBatch called with', movements.length, 'movements');
  
  if (!isSupabaseConfigured()) {
    console.warn('[Cloud] Supabase not configured for movements');
    return false;
  }
  
  if (movements.length === 0) {
    console.warn('[Cloud] No movements to save');
    return false;
  }

  console.log('[Cloud] Saving movements batch:', movements.length, 'samples');
  console.log('[Cloud] Sample movement:', movements[0]);
  
  try {
    const dbMovements = movements.map(movementToDb);
    console.log('[Cloud] Converted to DB format. Sample:', dbMovements[0]);
    
    // Insert in batches of 500 to avoid payload limits (reduced from 1000)
    const batchSize = 500;
    let totalSaved = 0;
    
    for (let i = 0; i < dbMovements.length; i += batchSize) {
      const batch = dbMovements.slice(i, i + batchSize);
      console.log(`[Cloud] Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(dbMovements.length/batchSize)} (${batch.length} items)`);
      
      const { data, error } = await supabase.from('movements').insert(batch).select('id');
      
      if (error) {
        console.error('[Cloud] ❌ Error saving movements batch:', error.message, error.details, error.hint, error.code);
        return false;
      }
      
      totalSaved += batch.length;
      console.log(`[Cloud] Batch saved. Total so far: ${totalSaved}`);
    }
    
    console.log('[Cloud] ✅ All movements saved:', totalSaved);
    return true;
  } catch (err) {
    console.error('[Cloud] ❌ Exception saving movements:', err);
    return false;
  }
}

export async function cloudGetMovementsForSession(sessionId: string): Promise<MovementSample[]> {
  if (!isSupabaseConfigured()) return [];

  console.log('[Cloud] Fetching movements for session:', sessionId);
  
  try {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_index')
      .order('timestamp_ms');

    if (error) {
      console.error('[Cloud] ❌ Error fetching movements:', error.message);
      return [];
    }

    console.log('[Cloud] ✅ Movements fetched:', data?.length || 0);
    return (data || []).map(dbToMovement);
  } catch (err) {
    console.error('[Cloud] ❌ Exception fetching movements:', err);
    return [];
  }
}

// ============ EVENT OPERATIONS ============

export async function cloudSaveEventBatch(events: GameEvent[]): Promise<boolean> {
  if (!isSupabaseConfigured() || events.length === 0) return false;

  console.log('[Cloud] Saving events batch:', events.length, 'events');
  
  try {
    const dbEvents = events.map(eventToDb);
    const { error } = await supabase.from('events').insert(dbEvents);

    if (error) {
      console.error('[Cloud] ❌ Error saving events:', error.message);
      return false;
    }
    console.log('[Cloud] ✅ All events saved');
    return true;
  } catch (err) {
    console.error('[Cloud] ❌ Exception saving events:', err);
    return false;
  }
}

export async function cloudGetEventsForSession(sessionId: string): Promise<GameEvent[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_index')
      .order('timestamp_ms');

    if (error) {
      console.error('Error fetching events from cloud:', error);
      return [];
    }

    return (data || []).map(dbToEvent);
  } catch (err) {
    console.error('Cloud fetch error:', err);
    return [];
  }
}

// ============ FULL SESSION DATA ============

export async function cloudGetFullSessionData(sessionId: string) {
  if (!isSupabaseConfigured()) return null;

  const session = await cloudGetSession(sessionId);
  if (!session) return null;

  const [rounds, movements, events] = await Promise.all([
    cloudGetRoundsForSession(sessionId),
    cloudGetMovementsForSession(sessionId),
    cloudGetEventsForSession(sessionId),
  ]);

  return { session, rounds, movements, events };
}

// ============ SYNC COMPLETE SESSION ============

export async function cloudSyncCompleteSession(
  session: Session,
  rounds: Round[],
  movements: MovementSample[],
  events: GameEvent[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // First check if session already exists
    const existing = await cloudGetSession(session.sessionId);
    
    if (existing) {
      // Update existing session
      await cloudUpdateSession(session.sessionId, session);
    } else {
      // Create new session
      await cloudCreateSession(session);
    }

    // Save rounds
    for (const round of rounds) {
      await cloudSaveRound(round);
    }

    // Save movements in batches
    if (movements.length > 0) {
      await cloudSaveMovementBatch(movements);
    }

    // Save events
    if (events.length > 0) {
      await cloudSaveEventBatch(events);
    }

    return true;
  } catch (err) {
    console.error('Error syncing complete session:', err);
    return false;
  }
}

