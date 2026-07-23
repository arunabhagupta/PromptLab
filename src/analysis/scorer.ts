import type { Band, ElementDetection, PromptElement, ScoreResult, ScoringRules } from '../types';

const ELEMENT_ORDER: PromptElement[] = ['persona', 'task', 'context', 'format', 'examples', 'tone', 'safeguards'];

export function bandFor(score: number): Band {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  return 'poor';
}

function firstMatch(text: string, patterns: string[]): string | null {
  for (const p of patterns) {
    const m = text.match(new RegExp(p, 'i'));
    if (m) return m[0];
  }
  return null;
}

export function scorePrompt(text: string, rules: ScoringRules): ScoreResult {
  const trimmed = text.trim();
  const elements: ElementDetection[] = ELEMENT_ORDER.map((element) => {
    const rule = rules.elements[element];
    const evidence = trimmed === '' ? null : firstMatch(trimmed, rule.patterns);
    return { element, present: evidence !== null, evidence: evidence ?? '', tip: rule.tip, weight: rule.weight };
  });

  const flags = trimmed === '' ? [] : rules.flags
    .map((f) => {
      const matches = f.patterns
        .map((p) => trimmed.match(new RegExp(p, 'i'))?.[0])
        .filter((m): m is string => m !== undefined);
      return { id: f.id, label: f.label, advice: f.advice, penalty: f.penalty, matches };
    })
    .filter((f) => f.matches.length > 0);

  const bonuses = trimmed === '' ? [] : rules.bonuses
    .filter((b) => firstMatch(trimmed, b.patterns) !== null)
    .map((b) => ({ id: b.id, label: b.label, points: b.points }));

  const base = elements.reduce((sum, e) => sum + (e.present ? e.weight : 0), 0);
  const penalty = flags.reduce((sum, f) => sum + f.penalty, 0);
  const bonus = bonuses.reduce((sum, b) => sum + b.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(base - penalty + bonus)));

  const feedback = [
    ...elements.filter((e) => !e.present).map((e) => e.tip),
    ...flags.map((f) => f.advice),
  ];

  return { score, band: bandFor(score), elements, flags, bonuses, feedback };
}
