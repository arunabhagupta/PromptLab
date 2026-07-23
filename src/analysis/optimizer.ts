import type { OptimizerEdit, OptimizerResult, ScoringRules } from '../types';
import { analyzeTokens } from './tokenizer';

const TIPS: { test: (text: string) => boolean; tip: string }[] = [
  {
    test: (t) => t.length > 120 && (t.match(/\band\b/gi)?.length ?? 0) >= 3 && !t.includes('\n- '),
    tip: 'Long "and… and… and…" prose: convert the list into bullets — fewer tokens, clearer structure.',
  },
  {
    test: (t) => t.length > 300 && !/["'`]{3}|---|<[a-z_]+>/i.test(t),
    tip: 'Long prompt without delimiters: wrap pasted data in ``` fences so instructions and data can\'t blur.',
  },
  {
    test: (t) => /(:?do not|don't|avoid)[^.]{0,60}(do not|don't|avoid)/i.test(t),
    tip: 'Multiple negative instructions: rephrase as one positive instruction ("write in active voice" beats two "don\'t"s).',
  },
];

/** Case-preserving filler removal driven by rules.fillers; lowercase patterns only match case-insensitively. */
export function optimizePrompt(text: string, rules: ScoringRules): OptimizerResult {
  let optimized = text;
  const edits: OptimizerEdit[] = [];

  for (const { pattern, replacement } of rules.fillers) {
    // guard: forbid matching as a prefix or suffix fragment of a longer word (symmetric boundary)
    let source = pattern;
    if (/^[a-z0-9]/i.test(pattern)) source = `(?<![a-z0-9])${source}`;
    if (/[a-z0-9]$/i.test(pattern)) source = `${source}(?![a-z0-9])`;
    const re = new RegExp(source, 'gi');
    if (!re.test(optimized)) continue;
    // collapse only interior space runs created by the removal — never line-leading indentation
    const next = optimized.replace(re, replacement).replace(/(?<=\S) {2,}(?=\S)/g, ' ');
    if (next === optimized) continue;
    const saved = analyzeTokens(optimized).count - analyzeTokens(next).count;
    edits.push({ from: pattern.replace(/\\\.\??/g, '.'), to: replacement.trim() || '(removed)', tokensSaved: Math.max(0, saved) });
    optimized = next;
  }
  if (edits.length > 0) {
    // recapitalize ONLY the first character of the text (common case: leading "please " was removed);
    // never touch interior sentence boundaries — abbreviations like "e.g." make them unreliable
    optimized = optimized.replace(/^\s+/, '');
    optimized = optimized.charAt(0).toLowerCase() === optimized.charAt(0) && /[a-z]/.test(optimized.charAt(0))
      ? optimized.charAt(0).toUpperCase() + optimized.slice(1)
      : optimized;
    optimized = optimized.replace(/[ \t]+$/gm, '');
  } else {
    optimized = text; // no edits → return input verbatim
  }

  const tips = TIPS.filter((t) => t.test(text)).map((t) => t.tip);

  return {
    original: text,
    optimized,
    originalTokens: analyzeTokens(text).count,
    optimizedTokens: analyzeTokens(optimized).count,
    edits,
    tips,
  };
}
