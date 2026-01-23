/**
 * RACE STATE MACHINE TEST SUITE
 * Tests for race state transitions, concurrency, and winner determination
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRaceState,
  addOpponent,
  startCountdown,
  startRace,
  updateProgress,
  completeRace,
  cancelRace,
  isValidTransition,
  serializeRaceState,
  deserializeRaceState,
  type RaceState,
} from '../race-state-machine';

describe('Race State Machine', () => {
  let raceState: RaceState;
  
  beforeEach(() => {
    raceState = createRaceState('race-1', 'ABC123', 'host-1', 'Test text');
  });

  describe('createRaceState', () => {
    it('should create initial state correctly', () => {
      expect(raceState.id).toBe('race-1');
      expect(raceState.roomCode).toBe('ABC123');
      expect(raceState.status).toBe('waiting');
      expect(raceState.hostId).toBe('host-1');
      expect(raceState.host.progress).toBe(0);
      expect(raceState.opponent).toBeUndefined();
      expect(raceState.version).toBe(0);
    });
  });

  describe('isValidTransition', () => {
    it('should allow waiting -> countdown', () => {
      expect(isValidTransition('waiting', 'countdown')).toBe(true);
    });

    it('should allow countdown -> active', () => {
      expect(isValidTransition('countdown', 'active')).toBe(true);
    });

    it('should allow active -> completed', () => {
      expect(isValidTransition('active', 'completed')).toBe(true);
    });

    it('should disallow backwards transitions', () => {
      expect(isValidTransition('active', 'countdown')).toBe(false);
      expect(isValidTransition('completed', 'active')).toBe(false);
    });

    it('should allow cancellation from any non-terminal state', () => {
      expect(isValidTransition('waiting', 'cancelled')).toBe(true);
      expect(isValidTransition('countdown', 'cancelled')).toBe(true);
      expect(isValidTransition('active', 'cancelled')).toBe(true);
    });

    it('should disallow transitions from terminal states', () => {
      expect(isValidTransition('completed', 'waiting')).toBe(false);
      expect(isValidTransition('cancelled', 'active')).toBe(false);
    });
  });

  describe('addOpponent', () => {
    it('should add human opponent', () => {
      const updated = addOpponent(raceState, 'opponent-1');
      
      expect(updated.opponent).toBeDefined();
      expect(updated.opponent?.id).toBe('opponent-1');
      expect(updated.opponent?.isBot).toBe(false);
      expect(updated.version).toBe(1);
    });

    it('should add bot opponent', () => {
      const updated = addOpponent(raceState, 'bot-1', true, 'intermediate');
      
      expect(updated.opponent?.isBot).toBe(true);
      expect(updated.opponent?.botLevel).toBe('intermediate');
    });

    it('should throw if race not waiting', () => {
      const started = { ...raceState, status: 'active' as const };
      
      expect(() => addOpponent(started, 'opponent-1')).toThrow();
    });

    it('should throw if opponent already exists', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      
      expect(() => addOpponent(withOpponent, 'opponent-2')).toThrow();
    });
  });

  describe('startCountdown', () => {
    it('should transition to countdown', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const updated = startCountdown(withOpponent, 'host-1');
      
      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('countdown');
      expect(updated?.countdownStartedAt).toBeDefined();
      expect(updated?.version).toBe(2);
    });

    it('should be idempotent (return null if already countdown)', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      const duplicate = startCountdown(countdown, 'host-1');
      
      expect(duplicate).toBeNull();
    });

    it('should throw if no opponent', () => {
      expect(() => startCountdown(raceState, 'host-1')).toThrow();
    });
  });

  describe('startRace', () => {
    it('should transition to active', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      const active = startRace(countdown);
      
      expect(active).not.toBeNull();
      expect(active?.status).toBe('active');
      expect(active?.raceStartedAt).toBeDefined();
    });

    it('should be idempotent', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      const active = startRace(countdown)!;
      const duplicate = startRace(active);
      
      expect(duplicate).toBeNull();
    });
  });

  describe('updateProgress', () => {
    let activeRace: RaceState;
    
    beforeEach(() => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      activeRace = startRace(countdown)!;
    });

    it('should update host progress', () => {
      const updated = updateProgress(activeRace, 'host-1', 50, 60, 95);
      
      expect(updated.host.progress).toBe(50);
      expect(updated.host.wpm).toBe(60);
      expect(updated.host.accuracy).toBe(95);
    });

    it('should update opponent progress', () => {
      const updated = updateProgress(activeRace, 'opponent-1', 30, 45, 90);
      
      expect(updated.opponent?.progress).toBe(30);
      expect(updated.opponent?.wpm).toBe(45);
      expect(updated.opponent?.accuracy).toBe(90);
    });

    it('should clamp progress to 0-100', () => {
      const updated = updateProgress(activeRace, 'host-1', 150, 60, 95);
      expect(updated.host.progress).toBe(100);
      
      const updated2 = updateProgress(activeRace, 'host-1', -10, 60, 95);
      expect(updated2.host.progress).toBe(0);
    });

    it('should clamp WPM to 0-500', () => {
      const updated = updateProgress(activeRace, 'host-1', 50, 600, 95);
      expect(updated.host.wpm).toBe(500);
    });

    it('should set finishedAt when reaching 100%', () => {
      const updated = updateProgress(activeRace, 'host-1', 100, 60, 95);
      expect(updated.host.finishedAt).toBeDefined();
    });

    it('should throw if not in active status', () => {
      expect(() => updateProgress(raceState, 'host-1', 50, 60, 95)).toThrow();
    });

    it('should throw for non-participant', () => {
      expect(() => updateProgress(activeRace, 'stranger', 50, 60, 95)).toThrow();
    });
  });

  describe('completeRace', () => {
    let activeRace: RaceState;
    
    beforeEach(() => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      activeRace = startRace(countdown)!;
    });

    it('should determine winner by progress', () => {
      let race = updateProgress(activeRace, 'host-1', 100, 60, 95);
      race = updateProgress(race, 'opponent-1', 80, 70, 90);
      const completed = completeRace(race);
      
      expect(completed.status).toBe('completed');
      expect(completed.winnerId).toBe('host-1');
    });

    it('should use WPM as tiebreaker', () => {
      let race = updateProgress(activeRace, 'host-1', 50, 60, 95);
      race = updateProgress(race, 'opponent-1', 50, 70, 90);
      const completed = completeRace(race);
      
      expect(completed.winnerId).toBe('opponent-1'); // Higher WPM
    });

    it('should be idempotent', () => {
      let race = updateProgress(activeRace, 'host-1', 100, 60, 95);
      const completed = completeRace(race);
      const duplicate = completeRace(completed);
      
      expect(duplicate).toEqual(completed);
    });
  });

  describe('cancelRace', () => {
    it('should cancel waiting race', () => {
      const cancelled = cancelRace(raceState);
      
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.raceEndedAt).toBeDefined();
    });

    it('should be idempotent', () => {
      const cancelled = cancelRace(raceState);
      const duplicate = cancelRace(cancelled);
      
      expect(duplicate).toEqual(cancelled);
    });

    it('should not cancel completed race', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      const active = startRace(countdown)!;
      const completed = completeRace(active);
      
      const result = cancelRace(completed);
      expect(result.status).toBe('completed');
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const withOpponent = addOpponent(raceState, 'opponent-1', true, 'pro');
      const countdown = startCountdown(withOpponent, 'host-1')!;
      const active = startRace(countdown)!;
      const updated = updateProgress(active, 'host-1', 50, 60, 95);
      
      const serialized = serializeRaceState(updated);
      const deserialized = deserializeRaceState(serialized);
      
      expect(deserialized.id).toBe(updated.id);
      expect(deserialized.status).toBe(updated.status);
      expect(deserialized.host.progress).toBe(updated.host.progress);
      expect(deserialized.opponent?.isBot).toBe(true);
      expect(deserialized.opponent?.botLevel).toBe('pro');
    });

    it('should handle null opponent', () => {
      const serialized = serializeRaceState(raceState);
      const deserialized = deserializeRaceState(serialized);
      
      expect(deserialized.opponent).toBeUndefined();
    });
  });
});

describe('Countdown Duplicate Prevention', () => {
  it('should not start countdown twice (idempotent)', () => {
    const race = createRaceState('race-1', 'ABC123', 'host-1', 'Test');
    const withOpponent = addOpponent(race, 'opponent-1');
    
    // First call succeeds
    const result1 = startCountdown(withOpponent, 'host-1');
    expect(result1).not.toBeNull();
    expect(result1?.status).toBe('countdown');
    
    // Second call is idempotent (returns null)
    const result2 = startCountdown(result1!, 'host-1');
    expect(result2).toBeNull();
    
    // State unchanged
    expect(result1?.status).toBe('countdown');
  });

  it('should prevent race condition on countdown', () => {
    const race = createRaceState('race-1', 'ABC123', 'host-1', 'Test');
    const withOpponent = addOpponent(race, 'opponent-1');
    
    // Simulate concurrent calls
    const results: (RaceState | null)[] = [];
    for (let i = 0; i < 10; i++) {
      // Each call after the first should return null
      const current = results.length > 0 ? results[results.length - 1] || withOpponent : withOpponent;
      results.push(startCountdown(current, 'host-1'));
    }
    
    // Only first should succeed
    expect(results.filter(r => r !== null).length).toBe(1);
  });
});

describe('Winner Determination Edge Cases', () => {
  it('should handle simultaneous finish (same millisecond)', () => {
    const race = createRaceState('race-1', 'ABC123', 'host-1', 'Test');
    const withOpponent = addOpponent(race, 'opponent-1');
    const countdown = startCountdown(withOpponent, 'host-1')!;
    let active = startRace(countdown)!;
    
    // Both reach 100% at same time
    active = updateProgress(active, 'host-1', 100, 60, 95);
    active = updateProgress(active, 'opponent-1', 100, 70, 90);
    
    const completed = completeRace(active);
    
    // Winner should be determined (not undefined)
    expect(completed.winnerId).toBeDefined();
    // Should be opponent due to higher WPM
    expect(completed.winnerId).toBe('opponent-1');
  });

  it('should handle unfinished race completion', () => {
    const race = createRaceState('race-1', 'ABC123', 'host-1', 'Test');
    const withOpponent = addOpponent(race, 'opponent-1');
    const countdown = startCountdown(withOpponent, 'host-1')!;
    let active = startRace(countdown)!;
    
    // Neither finished
    active = updateProgress(active, 'host-1', 60, 50, 95);
    active = updateProgress(active, 'opponent-1', 40, 70, 90);
    
    const completed = completeRace(active);
    
    // Host wins by progress
    expect(completed.winnerId).toBe('host-1');
  });
});
