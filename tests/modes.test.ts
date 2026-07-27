import { describe, it, expect } from 'vitest';
import { ENABLED_MODES, isEnabledMode } from '../src/app/modes';

describe('ENABLED_MODES', () => {
  it('exposes only learn and cheatsheet', () => {
    expect([...ENABLED_MODES]).toEqual(['learn', 'cheatsheet']);
  });
  it('isEnabledMode accepts enabled modes', () => {
    expect(isEnabledMode('learn')).toBe(true);
    expect(isEnabledMode('cheatsheet')).toBe(true);
  });
  it('isEnabledMode rejects disabled and unknown modes', () => {
    expect(isEnabledMode('sandbox')).toBe(false);
    expect(isEnabledMode('compare')).toBe(false);
    expect(isEnabledMode('nonsense')).toBe(false);
  });
});
