/**
 * `parisToUtcInstant`, pure — no D1, no fetch. The one thing worth pinning
 * down is the DST boundary: Paris sits at UTC+1 in winter, UTC+2 in summer,
 * and a scheduling bug that only shows up six months later is the kind
 * nobody notices until a newsletter goes out at the wrong hour.
 */
import { describe, it, expect } from 'vitest';
import { parisToUtcInstant } from '../../functions/_lib/schedule';

describe('NL-5 parisToUtcInstant', () => {
  it('subtracts one hour in January (UTC+1, standard time)', () => {
    expect(parisToUtcInstant('2026-01-15', '09:00')).toBe('2026-01-15 08:00:00');
  });

  it('subtracts two hours in July (UTC+2, summer time)', () => {
    expect(parisToUtcInstant('2026-07-15', '09:00')).toBe('2026-07-15 07:00:00');
  });

  it('crosses midnight when the offset pushes the instant into the previous UTC day', () => {
    expect(parisToUtcInstant('2026-07-15', '01:00')).toBe('2026-07-14 23:00:00');
  });

  it('is deterministic — the same input always yields the same instant', () => {
    const first = parisToUtcInstant('2026-03-01', '12:00');
    const second = parisToUtcInstant('2026-03-01', '12:00');
    expect(first).toBe(second);
  });
});
