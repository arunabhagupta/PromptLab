import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoringRulesSchema, scenarioSchema } from '../src/content/schemas';
import { scorePrompt } from '../src/analysis/scorer';
import { simulate } from '../src/sim/simulate';
import type { Scenario, ScoringRules } from '../src/types';

const read = (p: string[]) => JSON.parse(readFileSync(join(__dirname, '..', ...p), 'utf-8'));
const rules = scoringRulesSchema.parse(read(['content', 'rules', 'scoring-rules.json'])) as ScoringRules;
const scenario = scenarioSchema.parse(read(['content', 'scenarios', 'aircraft-manuals.json'])) as Scenario;

describe('simulate', () => {
  const goodScore = scorePrompt(scenario.goodPrompt, rules);
  const badScore = scorePrompt(scenario.badPrompt, rules);
  const good = simulate(goodScore, scenario, scenario.goodPrompt, 142);
  const bad = simulate(badScore, scenario, scenario.badPrompt, 14);

  it('good prompt: relevant retrieval, low risk, correct tool, A-grade', () => {
    expect(good.retrieval.filter((r) => r.relevant).length).toBeGreaterThanOrEqual(2);
    expect(good.hallucinationRisk).toBe('low');
    expect(good.tool).toMatchObject({ called: true, correct: true, name: 'search_manuals' });
    expect(['A+', 'A']).toContain(good.response.grade);
    expect(good.response.text).toBe(scenario.responses[good.band]);
  });
  it('bad prompt: junk retrieval, high risk, no tool, D-grade', () => {
    expect(bad.retrieval.every((r) => !r.relevant)).toBe(true);
    expect(bad.hallucinationRisk).toBe('high');
    expect(bad.tool.called).toBe(false);
    expect(bad.response.grade).toBe('D-');
    expect(bad.response.text).toBe(scenario.responses.poor);
  });
  it('retrieval similarity ordered desc, in [0,1], length = top-3 docs', () => {
    expect(good.retrieval).toHaveLength(3);
    const sims = good.retrieval.map((r) => r.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
    for (const s of sims) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1); }
  });
  it('context window percentages sum to 100', () => {
    const cw = good.contextWindow;
    expect(cw.systemPct + cw.ragPct + cw.promptPct).toBe(100);
  });
  it('deterministic: same inputs, same outcome', () => {
    expect(simulate(goodScore, scenario, scenario.goodPrompt, 142)).toEqual(good);
  });
  it('response gauges scale with band', () => {
    expect(good.response.relevance).toBeGreaterThan(bad.response.relevance);
    expect(good.response.safety).toBeGreaterThan(bad.response.safety);
  });
});
