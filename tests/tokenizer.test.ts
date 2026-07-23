import { describe, it, expect } from 'vitest';
import { analyzeTokens, COST_PER_MTOK_USD } from '../src/analysis/tokenizer';

describe('analyzeTokens', () => {
  it('returns zero for empty text', () => {
    expect(analyzeTokens('')).toEqual({ count: 0, costUsd: 0, tokens: [] });
  });
  it('counts tokens and decodes chips that reassemble the text', () => {
    const r = analyzeTokens('You are a Digital Project Manager.');
    expect(r.count).toBeGreaterThan(4);
    expect(r.tokens.join('')).toBe('You are a Digital Project Manager.');
    expect(r.count).toBe(r.tokens.length);
  });
  it('estimates cost from the exported rate', () => {
    const r = analyzeTokens('hello world');
    expect(r.costUsd).toBeCloseTo((r.count / 1_000_000) * COST_PER_MTOK_USD, 10);
  });
  it('is deterministic', () => {
    expect(analyzeTokens('same input')).toEqual(analyzeTokens('same input'));
  });
});
