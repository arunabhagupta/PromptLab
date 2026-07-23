import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoringRulesSchema } from '../src/content/schemas';
import { scorePrompt, bandFor } from '../src/analysis/scorer';
import type { ScoringRules } from '../src/types';

const rules = scoringRulesSchema.parse(
  JSON.parse(readFileSync(join(__dirname, '..', 'content', 'rules', 'scoring-rules.json'), 'utf-8')),
) as ScoringRules;

const GOOD = 'You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Use a professional tone. Present it as a table with phases, owners and milestones. For example: "Month 1 — Pilot | Onboard 20 engineers". Do not include confidential data. What questions do you have for me that would help you provide the best output?';
const BAD = 'help me with AI rollout stuff for the docs thing, make it good';

describe('bandFor', () => {
  it('maps spec bands', () => {
    expect(bandFor(85)).toBe('excellent');
    expect(bandFor(84)).toBe('good');
    expect(bandFor(65)).toBe('good');
    expect(bandFor(64)).toBe('fair');
    expect(bandFor(45)).toBe('fair');
    expect(bandFor(44)).toBe('poor');
  });
});

describe('scorePrompt', () => {
  it('detects all 7 elements in the good aircraft prompt', () => {
    const r = scorePrompt(GOOD, rules);
    expect(r.elements).toHaveLength(7);
    expect(r.elements.map((e) => e.element)).toEqual(['persona', 'task', 'context', 'format', 'examples', 'tone', 'safeguards']);
    for (const e of r.elements) expect(e.present).toBe(true);
    expect(r.band).toBe('excellent');
    expect(r.score).toBeGreaterThanOrEqual(85);
  });
  it('bad prompt: few elements, vagueness flagged, poor band', () => {
    const r = scorePrompt(BAD, rules);
    expect(r.elements.find((e) => e.element === 'persona')!.present).toBe(false);
    expect(r.flags.some((f) => f.id === 'vagueness')).toBe(true);
    expect(r.band).toBe('poor');
  });
  it('earns bonuses for step-by-step and ask-feedback', () => {
    const r = scorePrompt("Let's think step-by-step. Create a plan. What questions do you have for me?", rules);
    expect(r.bonuses.map((b) => b.id)).toEqual(expect.arrayContaining(['step-by-step', 'ask-feedback']));
  });
  it('penalises conflicting instructions', () => {
    const r = scorePrompt('Write a short summary but also make it extremely detailed covering everything.', rules);
    expect(r.flags.some((f) => f.id === 'conflict')).toBe(true);
  });
  it('score is clamped to 0..100 and deterministic', () => {
    const r1 = scorePrompt(BAD, rules);
    const r2 = scorePrompt(BAD, rules);
    expect(r1.score).toBe(r2.score);
    expect(r1.score).toBeGreaterThanOrEqual(0);
    expect(r1.score).toBeLessThanOrEqual(100);
  });
  it('empty prompt scores 0 with all elements absent', () => {
    const r = scorePrompt('', rules);
    expect(r.score).toBe(0);
    expect(r.elements.every((e) => !e.present)).toBe(true);
  });
  it('feedback lists a tip for each missing element and advice for each flag', () => {
    const r = scorePrompt(BAD, rules);
    const missing = r.elements.filter((e) => !e.present).length;
    expect(r.feedback.length).toBe(missing + r.flags.length);
  });
  it('clamps the ceiling at 100 for over-scoring prompts', () => {
    const r = scorePrompt(GOOD, rules);
    expect(r.score).toBe(100);
  });
});
