/**
 * RACE STATE MACHINE
 * Server-authoritative race state management with idempotent transitions
 */

export type RaceStatus = 'waiting' | 'countdown' | 'active' | 'completed' | 'cancelled';

export interface RaceParticipant {
  id: string;
  isBot: boolean;
  botLevel?: 'beginner' | 'intermediate' | 'pro';
  progress: number;
  wpm: number;
  accuracy: number;
  finishedAt?: number;
}

export interface RaceState {
  id: string;
  roomCode: string;
  status: RaceStatus;
  expectedText: string;
  hostId: string;
  host: RaceParticipant;
  opponent?: RaceParticipant;
  countdownStartedAt?: number;
  raceStartedAt?: number;
  raceEndedAt?: number;
  winnerId?: string;
  version: number; // For optimistic concurrency control
  createdAt: number;
  updatedAt: number;
}

export interface RaceTransition {
  from: RaceStatus;
  to: RaceStatus;
  triggeredBy: string; // user_id or 'system'
  timestamp: number;
  idempotencyKey?: string;
}

// Valid state transitions
const VALID_TRANSITIONS: Record<RaceStatus, RaceStatus[]> = {
  waiting: ['countdown', 'cancelled'],
  countdown: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: RaceStatus, to: RaceStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Create initial race state
 */
export function createRaceState(
  id: string,
  roomCode: string,
  hostId: string,
  expectedText: string
): RaceState {
  const now = Date.now();
  
  return {
    id,
    roomCode,
    status: 'waiting',
    expectedText,
    hostId,
    host: {
      id: hostId,
      isBot: false,
      progress: 0,
      wpm: 0,
      accuracy: 100,
    },
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add opponent to race
 */
export function addOpponent(
  state: RaceState,
  opponentId: string,
  isBot: boolean = false,
  botLevel?: 'beginner' | 'intermediate' | 'pro'
): RaceState {
  if (state.status !== 'waiting') {
    throw new Error(`Cannot add opponent in status: ${state.status}`);
  }
  
  if (state.opponent) {
    throw new Error('Race already has an opponent');
  }
  
  return {
    ...state,
    opponent: {
      id: opponentId,
      isBot,
      botLevel,
      progress: 0,
      wpm: 0,
      accuracy: 100,
    },
    version: state.version + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Transition to countdown - IDEMPOTENT
 * Returns null if already in countdown (idempotent)
 */
export function startCountdown(
  state: RaceState,
  triggeredBy: string,
  idempotencyKey?: string
): RaceState | null {
  // Idempotent: if already in countdown, return null (no change needed)
  if (state.status === 'countdown') {
    return null;
  }
  
  if (!isValidTransition(state.status, 'countdown')) {
    throw new Error(`Invalid transition from ${state.status} to countdown`);
  }
  
  // Must have opponent to start countdown
  if (!state.opponent) {
    throw new Error('Cannot start countdown without opponent');
  }
  
  return {
    ...state,
    status: 'countdown',
    countdownStartedAt: Date.now(),
    version: state.version + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Transition to active racing - IDEMPOTENT
 */
export function startRace(state: RaceState): RaceState | null {
  if (state.status === 'active') {
    return null;
  }
  
  if (!isValidTransition(state.status, 'active')) {
    throw new Error(`Invalid transition from ${state.status} to active`);
  }
  
  return {
    ...state,
    status: 'active',
    raceStartedAt: Date.now(),
    version: state.version + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Update participant progress
 */
export function updateProgress(
  state: RaceState,
  participantId: string,
  progress: number,
  wpm: number,
  accuracy: number
): RaceState {
  if (state.status !== 'active') {
    throw new Error(`Cannot update progress in status: ${state.status}`);
  }
  
  // Validate bounds
  const safeProgress = Math.min(100, Math.max(0, progress));
  const safeWpm = Math.min(500, Math.max(0, wpm));
  const safeAccuracy = Math.min(100, Math.max(0, accuracy));
  
  const isHost = participantId === state.hostId;
  const isOpponent = participantId === state.opponent?.id;
  
  if (!isHost && !isOpponent) {
    throw new Error('Participant not in this race');
  }
  
  const newState = { ...state };
  
  if (isHost) {
    newState.host = {
      ...state.host,
      progress: safeProgress,
      wpm: safeWpm,
      accuracy: safeAccuracy,
      finishedAt: safeProgress >= 100 ? Date.now() : state.host.finishedAt,
    };
  } else if (state.opponent) {
    newState.opponent = {
      ...state.opponent,
      progress: safeProgress,
      wpm: safeWpm,
      accuracy: safeAccuracy,
      finishedAt: safeProgress >= 100 ? Date.now() : state.opponent.finishedAt,
    };
  }
  
  newState.version = state.version + 1;
  newState.updatedAt = Date.now();
  
  return newState;
}

/**
 * Determine winner and complete race
 * Winner is determined by:
 * 1. First to reach 100% progress
 * 2. If tie in progress, highest WPM
 * 3. If still tie, earliest finish time
 */
export function completeRace(state: RaceState): RaceState {
  if (state.status === 'completed') {
    return state;
  }
  
  if (!isValidTransition(state.status, 'completed')) {
    throw new Error(`Invalid transition from ${state.status} to completed`);
  }
  
  let winnerId: string | undefined;
  
  const hostProgress = state.host.progress;
  const opponentProgress = state.opponent?.progress ?? 0;
  
  if (hostProgress >= 100 && (opponentProgress < 100 || (state.host.finishedAt && (!state.opponent?.finishedAt || state.host.finishedAt < state.opponent.finishedAt)))) {
    winnerId = state.hostId;
  } else if (opponentProgress >= 100) {
    winnerId = state.opponent?.id;
  } else if (hostProgress > opponentProgress) {
    winnerId = state.hostId;
  } else if (opponentProgress > hostProgress) {
    winnerId = state.opponent?.id;
  } else {
    // Tie in progress, use WPM
    if (state.host.wpm >= (state.opponent?.wpm ?? 0)) {
      winnerId = state.hostId;
    } else {
      winnerId = state.opponent?.id;
    }
  }
  
  return {
    ...state,
    status: 'completed',
    winnerId,
    raceEndedAt: Date.now(),
    version: state.version + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Cancel race
 */
export function cancelRace(state: RaceState, reason?: string): RaceState {
  if (state.status === 'cancelled' || state.status === 'completed') {
    return state;
  }
  
  return {
    ...state,
    status: 'cancelled',
    raceEndedAt: Date.now(),
    version: state.version + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Serialize state for database storage
 */
export function serializeRaceState(state: RaceState): Record<string, any> {
  return {
    id: state.id,
    room_code: state.roomCode,
    status: state.status,
    expected_text: state.expectedText,
    host_id: state.hostId,
    host_progress: state.host.progress,
    host_wpm: state.host.wpm,
    host_accuracy: state.host.accuracy,
    opponent_id: state.opponent?.id ?? null,
    opponent_is_bot: state.opponent?.isBot ?? false,
    opponent_bot_level: state.opponent?.botLevel ?? null,
    opponent_progress: state.opponent?.progress ?? 0,
    opponent_wpm: state.opponent?.wpm ?? 0,
    opponent_accuracy: state.opponent?.accuracy ?? 100,
    countdown_started_at: state.countdownStartedAt ? new Date(state.countdownStartedAt).toISOString() : null,
    started_at: state.raceStartedAt ? new Date(state.raceStartedAt).toISOString() : null,
    ended_at: state.raceEndedAt ? new Date(state.raceEndedAt).toISOString() : null,
    winner_id: state.winnerId ?? null,
    version: state.version,
    created_at: new Date(state.createdAt).toISOString(),
    updated_at: new Date(state.updatedAt).toISOString(),
  };
}

/**
 * Deserialize state from database
 */
export function deserializeRaceState(data: Record<string, any>): RaceState {
  return {
    id: data.id,
    roomCode: data.room_code,
    status: data.status as RaceStatus,
    expectedText: data.expected_text,
    hostId: data.host_id,
    host: {
      id: data.host_id,
      isBot: false,
      progress: data.host_progress ?? 0,
      wpm: data.host_wpm ?? 0,
      accuracy: data.host_accuracy ?? 100,
    },
    opponent: data.opponent_id ? {
      id: data.opponent_id,
      isBot: data.opponent_is_bot ?? false,
      botLevel: data.opponent_bot_level,
      progress: data.opponent_progress ?? 0,
      wpm: data.opponent_wpm ?? 0,
      accuracy: data.opponent_accuracy ?? 100,
    } : undefined,
    countdownStartedAt: data.countdown_started_at ? new Date(data.countdown_started_at).getTime() : undefined,
    raceStartedAt: data.started_at ? new Date(data.started_at).getTime() : undefined,
    raceEndedAt: data.ended_at ? new Date(data.ended_at).getTime() : undefined,
    winnerId: data.winner_id,
    version: data.version ?? 0,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
  };
}
