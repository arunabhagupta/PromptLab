import type { Band, Scenario, ScoreResult, SimulationOutcome } from '../types';

const BAND_FACTOR: Record<Band, number> = { excellent: 1, good: 0.85, fair: 0.6, poor: 0.3 };
const RISK: Record<Band, 'low' | 'medium' | 'high'> = { excellent: 'low', good: 'low', fair: 'medium', poor: 'high' };
const GRADE: Record<Band, SimulationOutcome['response']['grade']> = { excellent: 'A+', good: 'A', fair: 'C', poor: 'D-' };
const GAUGES: Record<Band, { relevance: number; completeness: number; safety: number }> = {
  excellent: { relevance: 92, completeness: 88, safety: 97 },
  good: { relevance: 80, completeness: 74, safety: 90 },
  fair: { relevance: 58, completeness: 49, safety: 78 },
  poor: { relevance: 25, completeness: 18, safety: 52 },
};
const NEXT_STEPS: Record<Band, string[]> = {
  excellent: ['Try trimming tokens without losing score', 'Chain a follow-up prompt to refine one section'],
  good: ['Add an example demonstration', 'Add safeguards ("do not invent details")'],
  fair: ['Name a persona and one specific deliverable', 'State the output format explicitly'],
  poor: ['Rebuild with PTCF: Persona, Task, Context, Format', 'Replace vague words with specific keywords'],
};
const RELEVANT_THRESHOLD = 0.55;

/** similarity = keyword-overlap ratio scaled by band factor; deterministic */
function docSimilarity(promptText: string, keywords: string[], factor: number): number {
  const lower = promptText.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k.toLowerCase())).length;
  const overlap = hits / keywords.length;
  return Math.round(Math.min(1, 0.15 + overlap * 0.85) * factor * 100) / 100;
}

export function simulate(score: ScoreResult, scenario: Scenario, promptText: string, tokenCount: number): SimulationOutcome {
  const band = score.band;
  const factor = BAND_FACTOR[band];

  const retrieval = scenario.documents
    .map((d) => {
      const similarity = docSimilarity(promptText, d.keywords, factor);
      return { docId: d.id, title: d.title, similarity, relevant: similarity >= RELEVANT_THRESHOLD };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  // context window: prompt share grows with token count; RAG share with retrieval quality
  const promptPct = Math.max(10, Math.min(50, Math.round(tokenCount / 8)));
  const ragPct = Math.round((100 - promptPct - 15) * (retrieval.filter((r) => r.relevant).length / 3));
  const systemPct = 100 - promptPct - ragPct;

  const taskPresent = score.elements.find((e) => e.element === 'task')!.present;
  const correctTool = scenario.tools[0];
  const tool =
    band === 'poor' || !taskPresent
      ? { called: false, correct: false, name: '—', args: '' }
      : band === 'fair'
        ? { called: true, correct: false, name: scenario.tools[1].name, args: '(guessed arguments)' }
        : { called: true, correct: true, name: correctTool.name, args: correctTool.goodArgs };

  return {
    band,
    retrieval,
    contextWindow: { systemPct, ragPct, promptPct },
    hallucinationRisk: RISK[band],
    tool,
    response: { grade: GRADE[band], ...GAUGES[band], text: scenario.responses[band], nextSteps: NEXT_STEPS[band] },
  };
}
