import type { GlossaryEntry, Lesson, Scenario, ScoringRules } from '../types';
import { glossarySchema, lessonSchema, scenarioSchema, scoringRulesSchema } from './schemas';
import rulesJson from '../../content/rules/scoring-rules.json';
import glossaryJson from '../../content/glossary.json';

const scenarioModules = import.meta.glob('../../content/scenarios/*.json', { eager: true }) as Record<string, { default: unknown }>;
const lessonModules = import.meta.glob('../../content/lessons/*.json', { eager: true }) as Record<string, { default: unknown }>;

export function loadRules(): ScoringRules { return scoringRulesSchema.parse(rulesJson) as ScoringRules; }
export function loadGlossary(): GlossaryEntry[] { return glossarySchema.parse(glossaryJson); }
export function loadScenarios(): Scenario[] {
  return Object.values(scenarioModules).map((m) => scenarioSchema.parse(m.default) as Scenario);
}
export function loadLessons(): Lesson[] {
  return Object.values(lessonModules)
    .map((m) => lessonSchema.parse(m.default) as Lesson)
    .sort((a, b) => a.order - b.order);
}
