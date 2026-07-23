export type PromptElement =
  | 'persona' | 'task' | 'context' | 'format'
  | 'examples' | 'tone' | 'safeguards';

export type StageId = 'analyzer' | 'tokenizer' | 'rag' | 'llm' | 'mcp' | 'response';
export type Band = 'excellent' | 'good' | 'fair' | 'poor';

export interface ElementDetection {
  element: PromptElement;
  present: boolean;
  evidence: string;   // matched text, '' when absent
  tip: string;        // how to add it, from rules
  weight: number;
}
export interface Flag { id: string; label: string; advice: string; matches: string[]; penalty: number }
export interface Bonus { id: string; label: string; points: number }

export interface ScoreResult {
  score: number;               // 0-100 integer
  band: Band;
  elements: ElementDetection[]; // always 7, spec order
  flags: Flag[];               // only triggered flags
  bonuses: Bonus[];            // only earned bonuses
  feedback: string[];          // human-readable next actions
}

export interface ScoringRules {
  elements: Record<PromptElement, { weight: number; patterns: string[]; tip: string }>;
  flags: { id: string; label: string; advice: string; penalty: number; patterns: string[] }[];
  bonuses: { id: string; label: string; points: number; patterns: string[] }[];
  fillers: { pattern: string; replacement: string }[];   // optimizer rewrites
  bestPractices: { id: string; title: string; detail: string; source: 'user' | 'standard' }[];
}

export interface ScenarioDoc { id: string; title: string; keywords: string[] }
export interface ScenarioTool { name: string; goodArgs: string; description: string }
export interface Scenario {
  id: string; title: string; description: string;
  goodPrompt: string; badPrompt: string;
  documents: ScenarioDoc[];        // >= 3
  tools: ScenarioTool[];           // first tool = the correct one
  responses: Record<Band, string>; // curated response text per band
}

export interface LessonStep {
  spotlight: StageId | 'composer' | 'none';
  heading: string;
  body: string;
  prompt?: string;      // when set, load this prompt into the composer
  variant?: 'good' | 'bad' | 'compare';
}
export interface Lesson {
  id: string; order: number; title: string; scenarioId: string;
  steps: LessonStep[];
  challenge: { brief: string; requiredElements: PromptElement[] };
}

export interface GlossaryEntry { term: string; definition: string }

export interface TokenInfo { count: number; costUsd: number; tokens: string[] }

export interface OptimizerEdit { from: string; to: string; tokensSaved: number }
export interface OptimizerResult {
  original: string; optimized: string;
  originalTokens: number; optimizedTokens: number;
  edits: OptimizerEdit[];
  tips: string[];
}

export interface SimulationOutcome {
  band: Band;
  retrieval: { docId: string; title: string; similarity: number; relevant: boolean }[];
  contextWindow: { systemPct: number; ragPct: number; promptPct: number };
  hallucinationRisk: 'low' | 'medium' | 'high';
  tool: { called: boolean; correct: boolean; name: string; args: string };
  response: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D-';
    relevance: number; completeness: number; safety: number;  // 0-100
    text: string; nextSteps: string[];
  };
}
