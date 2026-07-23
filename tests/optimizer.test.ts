import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoringRulesSchema } from '../src/content/schemas';
import { optimizePrompt } from '../src/analysis/optimizer';
import { analyzeTokens } from '../src/analysis/tokenizer';
import type { ScoringRules } from '../src/types';

const rules = scoringRulesSchema.parse(
  JSON.parse(readFileSync(join(__dirname, '..', 'content', 'rules', 'scoring-rules.json'), 'utf-8')),
) as ScoringRules;

describe('optimizePrompt', () => {
  it('strips filler and reports token savings', () => {
    const r = optimizePrompt('Could you please kindly create a summary in order to be able to inform the team. Thank you in advance.', rules);
    expect(r.optimized.toLowerCase()).not.toContain('please');
    expect(r.optimized.toLowerCase()).not.toContain('kindly');
    expect(r.optimized).toContain('to inform the team');
    expect(r.optimizedTokens).toBeLessThan(r.originalTokens);
    expect(r.edits.length).toBeGreaterThanOrEqual(2);
    expect(r.originalTokens).toBe(analyzeTokens(r.original).count);
    expect(r.optimizedTokens).toBe(analyzeTokens(r.optimized).count);
  });
  it('leaves an already-tight prompt unchanged with no edits', () => {
    const tight = 'Create a 5-bullet summary of Q3 revenue for the board.';
    const r = optimizePrompt(tight, rules);
    expect(r.optimized).toBe(tight);
    expect(r.edits).toHaveLength(0);
  });
  it('suggests bullets for long prose containing enumerations', () => {
    const listy = 'Write a plan and it should cover budget and it should cover timeline and it should cover risks and it should cover staffing and make sure each area is described.';
    const r = optimizePrompt(listy, rules);
    expect(r.tips.some((t) => t.toLowerCase().includes('bullet'))).toBe(true);
  });
  it('never changes meaning-bearing capitalised words', () => {
    const r = optimizePrompt('Please summarise the Berlin Really Important Report.', rules);
    expect(r.optimized).toContain('Berlin');
  });
  it('preserves indentation in embedded code blocks', () => {
    const r = optimizePrompt('Please review this code and explain it:\n    def foo():\n        return 1\n', rules);
    expect(r.optimized).toContain('\n    def foo():');
    expect(r.optimized).toContain('\n        return 1');
    expect(r.optimized.toLowerCase()).not.toContain('please ');
  });
  it('does not capitalize after abbreviations like e.g.', () => {
    const r = optimizePrompt('Please write a summary, e.g. include key metrics, for the board. Thank you in advance.', rules);
    expect(r.optimized).toContain('e.g. include');
    expect(r.optimized).not.toContain('e.g. Include');
  });
  it('never removes filler text embedded inside longer words', () => {
    const r = optimizePrompt('Please act at this point in timeless fashion.', rules);
    expect(r.optimized).toContain('timeless');
    expect(r.optimized).not.toContain('nowless');
  });
  it('never strips fillers matching as a suffix of a longer word', () => {
    const r = optimizePrompt('Please summarize every product feature and the delivery plan.', rules);
    expect(r.optimized).toContain('every product');
    expect(r.optimized).toContain('delivery plan');
  });
  it('records an edit for every text mutation', () => {
    const r = optimizePrompt('Could you please kindly create a summary. Thank you in advance.', rules);
    expect(r.edits.length).toBeGreaterThan(0);
    // if optimized differs from original, at least one edit must exist
    if (r.optimized !== r.original) expect(r.edits.length).toBeGreaterThan(0);
  });
});
