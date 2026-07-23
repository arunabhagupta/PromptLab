import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { glossarySchema, lessonSchema, scenarioSchema, scoringRulesSchema } from '../src/content/schemas';

const root = join(__dirname, '..', 'content');
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'));

describe('content validity', () => {
  it('scoring-rules.json matches schema and weights sum to 100', () => {
    const rules = scoringRulesSchema.parse(readJson(join(root, 'rules', 'scoring-rules.json')));
    const sum = Object.values(rules.elements).reduce((a, e) => a + e.weight, 0);
    expect(sum).toBe(100);
  });
  it('every pattern in rules is a valid case-insensitive regex', () => {
    const rules = scoringRulesSchema.parse(readJson(join(root, 'rules', 'scoring-rules.json')));
    const all = [
      ...Object.values(rules.elements).flatMap((e) => e.patterns),
      ...rules.flags.flatMap((f) => f.patterns),
      ...rules.bonuses.flatMap((b) => b.patterns),
      ...rules.fillers.map((f) => f.pattern),
    ];
    for (const p of all) expect(() => new RegExp(p, 'i')).not.toThrow();
  });
  it('all scenarios match schema', () => {
    for (const f of readdirSync(join(root, 'scenarios'))) {
      scenarioSchema.parse(readJson(join(root, 'scenarios', f)));
    }
  });
  it('all lessons match schema and reference existing scenarios', () => {
    const scenarioIds = readdirSync(join(root, 'scenarios')).map((f) => (readJson(join(root, 'scenarios', f)) as { id: string }).id);
    let lessonFiles: string[] = [];
    try { lessonFiles = readdirSync(join(root, 'lessons')); } catch { /* none yet */ }
    for (const f of lessonFiles) {
      const lesson = lessonSchema.parse(readJson(join(root, 'lessons', f)));
      expect(scenarioIds).toContain(lesson.scenarioId);
    }
  });
  it('glossary matches schema', () => {
    glossarySchema.parse(readJson(join(root, 'glossary.json')));
  });
});
