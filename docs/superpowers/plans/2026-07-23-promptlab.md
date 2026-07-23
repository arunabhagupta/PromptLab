# PromptLab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PromptLab — an interactive, GitHub-Pages-hostable visualization that teaches prompt engineering by animating prompts through a six-stage pipeline (Analyzer → Tokenizer → RAG → LLM → MCP → Response), per the approved spec `docs/superpowers/specs/2026-07-23-promptlab-design.md`.

**Architecture:** React 18 + TypeScript + Vite SPA. All learning content is JSON in `content/` validated by zod schemas in CI. Deterministic engines (`scorer`, `optimizer`, `simulate`) derive every pipeline outcome from the prompt score, so identical input → identical output. One shared SVG/HTML pipeline canvas is driven by a rAF timeline; Learn, Sandbox, and Compare modes are thin layers over it.

**Tech Stack:** React 18, TypeScript (strict), Vite 5, Zustand 4, zod 3, gpt-tokenizer 2, Vitest 2. No router lib (hash-string in store). No CSS framework (single tokens.css).

## Global Constraints

- Project root is `D:\WORK\GitHub\GenAI_Learning_Courses\Prompt_Engineering` — **all paths below are relative to it**; all commits happen in the parent repo (`GenAI_Learning_Courses`).
- `vite.config.ts` must set `base: './'` (works at any GitHub Pages path).
- Working name **PromptLab**; suggested standalone repo name `prompt-engineering-lab`.
- Dark theme default; light theme via `:root[data-theme="light"]`; `prefers-reduced-motion` disables particle animation (instant states instead).
- Palette tokens (copy verbatim): bg `#0A0F1E`, panel `#111931`, panel2 `#0D1426`, inset `#0B1224`, line `#24304F`, ink `#E7EDFB`, mut `#8FA0C2`, dim `#5E6C8E`, cyan `#53D6F0`, green `#43DE9B`, red `#F26D85`, amber `#F2B94F`, violet `#9D8CFF`, blue `#5E9BFF`, magenta `#E579D8`.
- Element score weights (verbatim): persona 15, task 25, context 20, format 15, examples 10, tone 7, safeguards 8 (sum 100).
- Score bands (verbatim): `excellent ≥ 85`, `good ≥ 65`, `fair ≥ 45`, else `poor`.
- Stage ids (verbatim, in pipeline order): `analyzer`, `tokenizer`, `rag`, `llm`, `mcp`, `response`.
- BYO keys live in `localStorage` only; providers Gemini / OpenAI / Anthropic; Sandbox-only; upstream stages always simulated.
- Node ≥ 20. Run all npm/npx commands from the project root.
- TDD for `src/analysis/*`, `src/sim/*`, `src/engine/timeline.ts`, and content validation. UI tasks verify via `npm run build` + manual dev-server check (no component tests in v1).

## File Structure (complete map)

```
Prompt_Engineering/
├─ .github/workflows/deploy.yml        # Pages CI (activates when pushed as standalone repo)
├─ .gitignore  LICENSE  README.md  CONTRIBUTING.md
├─ package.json  tsconfig.json  vite.config.ts  index.html
├─ content/
│  ├─ rules/scoring-rules.json         # detectors, flags, bonuses, optimizer fillers, best practices
│  ├─ scenarios/aircraft-manuals.json  # featured scenario (good/bad prompts, docs, tools, responses)
│  ├─ lessons/01…08-*.json             # 8 lessons
│  └─ glossary.json
├─ src/
│  ├─ main.tsx  app/App.tsx  app/tokens.css  app/useHashMode.ts
│  ├─ types.ts                         # ALL shared types (single source of truth)
│  ├─ content/schemas.ts               # zod schemas mirroring types
│  ├─ content/load.ts                  # typed loaders (vite glob imports)
│  ├─ analysis/scorer.ts  analysis/optimizer.ts  analysis/tokenizer.ts
│  ├─ sim/simulate.ts
│  ├─ engine/timeline.ts               # pure advance() + useTimeline rAF hook
│  ├─ store.ts                         # zustand store (single file)
│  ├─ llm/providers.ts                 # gemini/openai/anthropic adapters
│  ├─ pipeline/registry.ts
│  ├─ pipeline/Canvas.tsx  pipeline/Particles.tsx
│  ├─ pipeline/stages/{Analyzer,Tokenizer,Rag,Llm,Mcp,Response}Stage.tsx   # Card + Expanded per file
│  ├─ modes/Sandbox.tsx  modes/Composer.tsx  modes/Transport.tsx
│  ├─ modes/Compare.tsx  modes/Learn.tsx  modes/CheatSheet.tsx
│  └─ components/{TopBar,StageOverlay,SettingsModal,Gauge}.tsx
└─ tests/
   ├─ content.test.ts  scorer.test.ts  optimizer.test.ts
   ├─ tokenizer.test.ts  simulate.test.ts  timeline.test.ts
```

---

### Task 1: Project scaffold, CI, theme tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `LICENSE`, `.github/workflows/deploy.yml`, `src/main.tsx`, `src/app/App.tsx`, `src/app/tokens.css`, `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a building, testable Vite app; CSS custom properties consumed by every later UI task (`--bg --panel --panel2 --inset --line --line2 --ink --mut --dim --cyan --green --red --amber --violet --blue --magenta --mono --sans`); npm scripts `dev`, `build`, `test`, `typecheck`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "prompt-engineering-lab",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "gpt-tokenizer": "^2.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.23.8",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
} as any);
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PromptLab — learn prompt engineering by watching it flow</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src/app/tokens.css**

```css
:root {
  --bg:#0A0F1E; --panel:#111931; --panel2:#0D1426; --inset:#0B1224;
  --line:#24304F; --line2:#1A2440;
  --ink:#E7EDFB; --mut:#8FA0C2; --dim:#5E6C8E;
  --cyan:#53D6F0; --green:#43DE9B; --red:#F26D85; --amber:#F2B94F;
  --violet:#9D8CFF; --blue:#5E9BFF; --magenta:#E579D8;
  --mono:ui-monospace,"Cascadia Code","SF Mono",Consolas,monospace;
  --sans:system-ui,-apple-system,"Segoe UI",sans-serif;
}
:root[data-theme="light"] {
  --bg:#F3F5FB; --panel:#FFFFFF; --panel2:#EDF0F8; --inset:#E4E9F4;
  --line:#C6CFE4; --line2:#D6DDEC;
  --ink:#131A2E; --mut:#4A5878; --dim:#7C89A8;
}
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; font-family: var(--sans); color: var(--ink); line-height: 1.5; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
```

- [ ] **Step 6: Create src/app/App.tsx and src/main.tsx**

`src/app/App.tsx`:
```tsx
export default function App() {
  return <div style={{ padding: 24, fontFamily: 'var(--mono)' }}>⚡ PromptLab — scaffold OK</div>;
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './app/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
```

- [ ] **Step 7: Create .gitignore, LICENSE, deploy.yml**

`.gitignore`:
```
node_modules/
dist/
*.local
```

`LICENSE`: MIT license text, copyright line `Copyright (c) 2026 Arunabha Gupta`.

`.github/workflows/deploy.yml` (activates once this folder is pushed as its own repo — harmless while nested):
```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    if: github.event_name == 'push'
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: Write smoke test** — `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs TS tests', () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 9: Install and verify**

Run: `npm install` then `npm test` then `npm run build`
Expected: install succeeds; 1 test passes; `dist/` produced with no TS errors.

- [ ] **Step 10: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): scaffold Vite+React+TS app with CI and theme tokens"
```

---

### Task 2: Shared types, zod content schemas, scoring-rules + scenario + glossary content

**Files:**
- Create: `src/types.ts`, `src/content/schemas.ts`, `src/content/load.ts`, `content/rules/scoring-rules.json`, `content/scenarios/aircraft-manuals.json`, `content/glossary.json`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact — later tasks import these):
  - `src/types.ts`: `PromptElement`, `ElementDetection`, `Flag`, `Bonus`, `ScoreResult`, `Band`, `ScoringRules`, `Scenario`, `ScenarioDoc`, `ScenarioTool`, `Lesson`, `LessonStep`, `GlossaryEntry`, `StageId`, `SimulationOutcome`, `TokenInfo`, `OptimizerResult`, `OptimizerEdit`.
  - `src/content/load.ts`: `loadRules(): ScoringRules`, `loadScenarios(): Scenario[]`, `loadLessons(): Lesson[]`, `loadGlossary(): GlossaryEntry[]` (synchronous, via `import.meta.glob(..., { eager: true })`; in Node tests use direct JSON imports through zod parse).
  - `src/content/schemas.ts`: `scoringRulesSchema`, `scenarioSchema`, `lessonSchema`, `glossarySchema` (zod).

- [ ] **Step 1: Create src/types.ts** (single source of truth — copy exactly)

```ts
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
```

- [ ] **Step 2: Create src/content/schemas.ts**

```ts
import { z } from 'zod';

const elementRule = z.object({ weight: z.number().int().positive(), patterns: z.array(z.string()).min(1), tip: z.string().min(1) });

export const scoringRulesSchema = z.object({
  elements: z.object({
    persona: elementRule, task: elementRule, context: elementRule, format: elementRule,
    examples: elementRule, tone: elementRule, safeguards: elementRule,
  }),
  flags: z.array(z.object({ id: z.string(), label: z.string(), advice: z.string(), penalty: z.number().int().positive(), patterns: z.array(z.string()).min(1) })),
  bonuses: z.array(z.object({ id: z.string(), label: z.string(), points: z.number().int().positive(), patterns: z.array(z.string()).min(1) })),
  fillers: z.array(z.object({ pattern: z.string(), replacement: z.string() })),
  bestPractices: z.array(z.object({ id: z.string(), title: z.string(), detail: z.string(), source: z.enum(['user', 'standard']) })),
});

export const scenarioSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(),
  goodPrompt: z.string().min(50), badPrompt: z.string().min(5),
  documents: z.array(z.object({ id: z.string(), title: z.string(), keywords: z.array(z.string()).min(1) })).min(3),
  tools: z.array(z.object({ name: z.string(), goodArgs: z.string(), description: z.string() })).min(2),
  responses: z.object({ excellent: z.string(), good: z.string(), fair: z.string(), poor: z.string() }),
});

const stageOrComposer = z.enum(['analyzer', 'tokenizer', 'rag', 'llm', 'mcp', 'response', 'composer', 'none']);
export const lessonSchema = z.object({
  id: z.string(), order: z.number().int().positive(), title: z.string(), scenarioId: z.string(),
  steps: z.array(z.object({
    spotlight: stageOrComposer, heading: z.string(), body: z.string(),
    prompt: z.string().optional(), variant: z.enum(['good', 'bad', 'compare']).optional(),
  })).min(2),
  challenge: z.object({
    brief: z.string(),
    requiredElements: z.array(z.enum(['persona', 'task', 'context', 'format', 'examples', 'tone', 'safeguards'])).min(1),
  }),
});

export const glossarySchema = z.array(z.object({ term: z.string(), definition: z.string() }));
```

- [ ] **Step 3: Create src/content/load.ts**

```ts
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
```

Note: `import.meta.glob` is Vite-only; `tests/content.test.ts` therefore validates the JSON files by reading them from disk with `fs`, not via `load.ts`. `loadRules`/`loadGlossary` use plain JSON imports and work everywhere.

- [ ] **Step 4: Create content/rules/scoring-rules.json** (complete — this is the heart of the teaching content; patterns are case-insensitive regex sources)

```json
{
  "elements": {
    "persona": { "weight": 15, "patterns": ["you are (a|an|the) ", "act as ", "as (a|an) [a-z]+ (expert|manager|engineer|specialist|analyst|consultant)", "take the role of"], "tip": "Start with who the AI should be: 'You are a Digital Project Manager at an aerospace company.'" },
    "task": { "weight": 25, "patterns": ["create ", "write ", "draft ", "summari[sz]e ", "generate ", "design ", "analy[sz]e ", "list ", "compare ", "explain ", "translate ", "build ", "produce "], "tip": "Name one specific action verb + deliverable: 'Create a 3-month AI Implementation & Adoption Strategy.'" },
    "context": { "weight": 20, "patterns": ["\\bfor\\b.{20,}", "\\bbecause\\b", "\\bgiven\\b", "balanc(e|ing)", "constraint", "compliance", "audience", "background:", "context:"], "tip": "Add the details that matter: who it's for, constraints, and why (e.g. 'balancing speed, training and data-security compliance')." },
    "format": { "weight": 15, "patterns": ["format", "as a table", "bullet", "numbered list", "markdown", "json", "structure (it|the)", "sections?:", "columns?", "one paragraph", "\\bslide"], "tip": "Say how the output should look: 'Present it as a table with phases, owners and milestones.'" },
    "examples": { "weight": 10, "patterns": ["for example", "e\\.g\\.", "example:", "such as:", "here is an example", "like this:", "sample:"], "tip": "Show one example of what good output looks like — models imitate demonstrations better than descriptions." },
    "tone": { "weight": 7, "patterns": ["\\btone\\b", "professional", "formal", "friendly", "concise(ly)?", "executive", "conversational", "persuasive"], "tip": "State the voice: 'Use a professional, confident tone suitable for senior leadership.'" },
    "safeguards": { "weight": 8, "patterns": ["do not (include|share|invent|fabricate)", "don't (include|share|invent)", "avoid ", "only use", "if you are unsure", "cite", "confidential", "no personal data", "stay within"], "tip": "Add guardrails: 'Do not include confidential data; if unsure, say so rather than inventing details.'" }
  },
  "flags": [
    { "id": "vagueness", "label": "Vague wording", "advice": "Replace vague words with specifics — name the system, audience, quantity, or deadline.", "penalty": 10, "patterns": ["\\bstuff\\b", "\\bthings?\\b", "\\bsomething\\b", "make it (good|nice|better)", "\\betc\\.?\\b", "help me with", "\\bwhatever\\b"] },
    { "id": "slang", "label": "Slang / informal", "advice": "Models map slang poorly — write in plain, complete sentences.", "penalty": 8, "patterns": ["\\bgonna\\b", "\\bwanna\\b", "\\bkinda\\b", "\\bidk\\b", "\\basap\\b", "\\bpls\\b", "\\bthx\\b", "\\bu\\b", "\\blol\\b"] },
    { "id": "conflict", "label": "Conflicting instructions", "advice": "Pick one: contradictory instructions confuse the model. Close one task before starting another.", "penalty": 12, "patterns": ["\\bshort\\b[\\s\\S]{0,80}\\bdetailed\\b", "\\bdetailed\\b[\\s\\S]{0,80}\\bshort\\b", "\\bformal\\b[\\s\\S]{0,60}\\bcasual\\b", "\\bcasual\\b[\\s\\S]{0,60}\\bformal\\b", "also[,]? (unrelated|separately|another topic)"] },
    { "id": "bias", "label": "Biased framing", "advice": "Remove assumptions about people or groups — ask for balanced, evidence-based output.", "penalty": 12, "patterns": ["only (men|women|young people|old people)", "\\b(men|women) are (better|worse)\\b", "obviously (everyone|nobody)", "typical (millennial|boomer)"] },
    { "id": "illegible", "label": "Hard to parse", "advice": "Use punctuation and capitalisation — a run-on wall of text degrades output quality.", "penalty": 6, "patterns": ["^[a-z][^.!?\\n]{200,}$"] }
  ],
  "bonuses": [
    { "id": "step-by-step", "label": "Reasoning trigger", "points": 5, "patterns": ["step[- ]by[- ]step", "think (it )?through", "show your reasoning"] },
    { "id": "ask-feedback", "label": "Asks for feedback", "points": 5, "patterns": ["what questions do you have", "ask me (anything|questions) (you need|before)"] },
    { "id": "delimiters", "label": "Uses delimiters", "points": 3, "patterns": ["\"\"\"", "```", "<[a-z_]+>", "---"] }
  ],
  "fillers": [
    { "pattern": "please kindly ", "replacement": "" },
    { "pattern": "kindly ", "replacement": "" },
    { "pattern": "i would like you to ", "replacement": "" },
    { "pattern": "i want you to ", "replacement": "" },
    { "pattern": "could you please ", "replacement": "" },
    { "pattern": "can you please ", "replacement": "" },
    { "pattern": "please ", "replacement": "" },
    { "pattern": "in order to be able to ", "replacement": "to " },
    { "pattern": "in order to ", "replacement": "to " },
    { "pattern": "due to the fact that ", "replacement": "because " },
    { "pattern": "at this point in time", "replacement": "now" },
    { "pattern": "it would be great if you could ", "replacement": "" },
    { "pattern": "basically ", "replacement": "" },
    { "pattern": "very ", "replacement": "" },
    { "pattern": "really ", "replacement": "" },
    { "pattern": "thank you in advance\\.?", "replacement": "" }
  ],
  "bestPractices": [
    { "id": "concise-clear", "title": "Concise and clear", "detail": "Every word should earn its place. Short, direct sentences beat padded politeness — the model doesn't need 'please kindly'.", "source": "user" },
    { "id": "contextually-relevant", "title": "Contextually relevant", "detail": "Include the details that change the answer: audience, constraints, domain, goal. Leave out everything else.", "source": "user" },
    { "id": "task-aligned", "title": "Aligned with the task", "detail": "One prompt, one job. Name the deliverable explicitly and close a task before starting a new one.", "source": "user" },
    { "id": "examples", "title": "Show example demonstrations", "detail": "One good example beats three paragraphs of description — models imitate patterns.", "source": "user" },
    { "id": "bias-free", "title": "Free from bias", "detail": "Don't bake assumptions about people or outcomes into the prompt; ask for balanced, evidence-based output.", "source": "user" },
    { "id": "specific-keywords", "title": "Be specific, use keywords", "detail": "Specific nouns steer retrieval and attention: 'aircraft maintenance manuals', not 'the docs'.", "source": "user" },
    { "id": "legible", "title": "Write legibly", "detail": "Correct punctuation, capitalisation, and grammar measurably improve output quality.", "source": "user" },
    { "id": "ask-feedback", "title": "Ask for feedback", "detail": "End with: 'What questions do you have for me that would help you provide the best output?' — it surfaces your blind spots.", "source": "user" },
    { "id": "chaining", "title": "Break it up (chaining)", "detail": "Split complex workflows into a sequence of smaller prompts; feed each output into the next.", "source": "user" },
    { "id": "iterate", "title": "Iterative fine-tuning", "detail": "Don't expect perfection first try — nudge with follow-ups: 'Make the second paragraph shorter.'", "source": "user" },
    { "id": "triggers", "title": "Prompt triggers", "detail": "'Let's think step-by-step' and similar phrases activate stronger reasoning patterns.", "source": "user" },
    { "id": "no-slang", "title": "No slang or vagueness", "detail": "Slang and vague language produce low-quality or inaccurate responses — write plainly and precisely.", "source": "user" },
    { "id": "no-conflict", "title": "No conflicting instructions", "detail": "Contradictory or multi-topic requests confuse the model. One topic per conversation thread.", "source": "user" },
    { "id": "delimiters", "title": "Delimit your structure", "detail": "Use ``` , \"\"\" or XML-style tags to separate instructions from data — the model can't mix up what's what.", "source": "standard" },
    { "id": "output-spec", "title": "Specify the output format", "detail": "Table? JSON? Bullet list with max 5 items? Say so — never make the model guess the shape.", "source": "standard" },
    { "id": "positive-framing", "title": "Say do, not don't", "detail": "'Write in active voice' works better than 'don't use passive voice' — models follow positive instructions more reliably.", "source": "standard" },
    { "id": "front-load", "title": "Front-load key instructions", "detail": "Put role and task first, supporting detail after — early tokens anchor the model's plan.", "source": "standard" },
    { "id": "token-economy", "title": "Mind the token budget", "detail": "Tokens cost money, latency, and context space. Trim filler; prefer bullets over prose for lists; don't repeat instructions.", "source": "standard" }
  ]
}
```

- [ ] **Step 5: Create content/scenarios/aircraft-manuals.json**

```json
{
  "id": "aircraft-manuals",
  "title": "AI rollout for aircraft-manual search",
  "description": "A Digital Project Manager must design a 3-month GenAI adoption strategy helping engineers search thousands of pages of technical aircraft manuals — balancing speed, user training, and strict data-security compliance.",
  "goodPrompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search and synthesize thousands of pages of technical aircraft manuals, balancing rollout speed, user training, and strict data-security compliance. Use a professional tone suitable for senior leadership. Present it as a table with columns for phase, actions, owners, and milestones. For example, a phase row could be: 'Month 1 — Pilot | Onboard 20 engineers to the manual-search assistant | Digital PM | 80% pilot activation'. Do not include confidential program names; if you are unsure about a detail, say so rather than inventing it. What questions do you have for me that would help you provide the best output?",
  "badPrompt": "help me with AI rollout stuff for the docs thing, make it good",
  "documents": [
    { "id": "manual_04.pdf", "title": "A320 Maintenance Manual, ch. 4", "keywords": ["aircraft", "manual", "maintenance", "engineers", "technical"] },
    { "id": "rollout_faq.md", "title": "GenAI Rollout FAQ", "keywords": ["rollout", "adoption", "strategy", "training", "ai", "generative"] },
    { "id": "security_policy.pdf", "title": "Data Security & Compliance Policy", "keywords": ["security", "compliance", "data", "confidential"] },
    { "id": "hr_policy.doc", "title": "HR Leave Policy", "keywords": ["leave", "holiday", "hr"] }
  ],
  "tools": [
    { "name": "search_manuals", "goodArgs": "query=\"AI adoption strategy aircraft manuals\", top_k=3", "description": "Searches the technical document index" },
    { "name": "create_ticket", "goodArgs": "", "description": "Opens an IT service ticket" },
    { "name": "send_email", "goodArgs": "", "description": "Sends an email on your behalf" }
  ],
  "responses": {
    "excellent": "# 3-Month AI Implementation & Adoption Strategy\n\n| Phase | Actions | Owners | Milestones |\n|---|---|---|---|\n| Month 1 — Pilot | Onboard 20 engineers to the manual-search assistant; baseline search-time metrics; security review sign-off | Digital PM · InfoSec | 80% pilot activation, zero security findings |\n| Month 2 — Expand | Train 3 engineering teams; publish prompt playbook; weekly office hours | Digital PM · Team Leads | 150 active users, CSAT ≥ 4/5 |\n| Month 3 — Scale | Org-wide rollout; integrate with document index; adoption dashboard | Digital PM · IT Ops | 60% weekly active usage, exec review |\n\nOpen questions for you: preferred pilot team, existing document index vendor, and compliance framework version?",
    "good": "# 3-Month AI Adoption Strategy\n\n| Phase | Actions | Milestones |\n|---|---|---|\n| Month 1 | Pilot with one engineering team | Pilot live |\n| Month 2 | Training sessions and feedback loop | 100 users trained |\n| Month 3 | Full rollout with security review | Org-wide access |\n\n(Owners not assigned — add stakeholder detail for a sharper plan.)",
    "fair": "Here's a general 3-month plan for AI adoption: start with a pilot, then training, then a broader rollout. Consider security along the way. You may want to define which tools, which teams, and what success looks like — the request left those open.",
    "poor": "Sure! AI rollout is exciting. You could try some AI tools for your documents, maybe run a survey, and see what sticks. Popular options include various chatbots. (⚠ This response guessed at your intent — the prompt gave no role, no deliverable, no constraints, and no format.)"
  }
}
```

- [ ] **Step 6: Create content/glossary.json**

```json
[
  { "term": "token", "definition": "The unit LLMs actually read — roughly ¾ of an English word. You pay, and wait, per token." },
  { "term": "context window", "definition": "The model's working memory: system prompt + retrieved documents + your prompt + its answer must all fit inside it." },
  { "term": "RAG", "definition": "Retrieval-Augmented Generation — the system searches your documents first and pastes the best matches into the context window before the model answers." },
  { "term": "embedding", "definition": "A list of numbers representing meaning; similar texts get nearby numbers, which is how retrieval finds relevant chunks." },
  { "term": "MCP", "definition": "Model Context Protocol — an open standard that lets models discover and call external tools (search, tickets, email) with structured arguments." },
  { "term": "hallucination", "definition": "A confident-sounding fabrication. Risk rises when the prompt is vague and retrieval returns junk." },
  { "term": "system prompt", "definition": "Hidden instructions the app puts before your prompt — rules, persona, and safety policy." },
  { "term": "top-k", "definition": "How many of the highest-similarity document chunks retrieval passes to the model." },
  { "term": "PTCF", "definition": "Persona, Task, Context, Format — the four load-bearing elements of a strong prompt." },
  { "term": "prompt chaining", "definition": "Splitting a big job into a sequence of small prompts, feeding each output into the next." }
]
```

- [ ] **Step 7: Write content validation test** — `tests/content.test.ts`:

```ts
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
```

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: content tests PASS (lessons dir may not exist yet — test tolerates that), smoke PASS.

- [ ] **Step 9: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): shared types, zod content schemas, scoring rules + aircraft scenario + glossary"
```

---

### Task 3: Scorer engine (TDD)

**Files:**
- Create: `src/analysis/scorer.ts`
- Test: `tests/scorer.test.ts`

**Interfaces:**
- Consumes: `ScoringRules`, `ScoreResult`, types from `src/types.ts` (Task 2); `loadRules()` in tests via direct JSON + schema parse.
- Produces: `scorePrompt(text: string, rules: ScoringRules): ScoreResult` and `bandFor(score: number): Band`. Deterministic; elements array always length 7 in order persona, task, context, format, examples, tone, safeguards.

- [ ] **Step 1: Write failing tests** — `tests/scorer.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/scorer.test.ts`
Expected: FAIL — cannot resolve `../src/analysis/scorer`.

- [ ] **Step 3: Implement src/analysis/scorer.ts**

```ts
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
```

- [ ] **Step 4: Run tests to pass**

Run: `npx vitest run tests/scorer.test.ts`
Expected: PASS (all). If the "good prompt scores excellent" test fails, the fix belongs in `content/rules/scoring-rules.json` patterns — not by weakening the test.

- [ ] **Step 5: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): rule-based prompt scorer with bands, flags, bonuses"
```

---

### Task 4: Tokenizer wrapper (TDD)

**Files:**
- Create: `src/analysis/tokenizer.ts`
- Test: `tests/tokenizer.test.ts`

**Interfaces:**
- Consumes: `TokenInfo` from `src/types.ts`; `gpt-tokenizer` package.
- Produces: `analyzeTokens(text: string): TokenInfo` (synchronous, pure) and `COST_PER_MTOK_USD = 0.15` (exported const; label in UI: "est. input cost, typical small model"). UI tasks call `analyzeTokens` inside a debounced effect — heavyweight enough; a dedicated Web Worker stays out of v1 (the encode of a ~500-token prompt is <5ms; note this deviation from spec §3 in the final README roadmap).

- [ ] **Step 1: Write failing tests** — `tests/tokenizer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/tokenizer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/analysis/tokenizer.ts**

```ts
import { encode, decode } from 'gpt-tokenizer';
import type { TokenInfo } from '../types';

/** est. input price per 1M tokens for a typical small model (UI label says "typical small model") */
export const COST_PER_MTOK_USD = 0.15;

export function analyzeTokens(text: string): TokenInfo {
  if (text === '') return { count: 0, costUsd: 0, tokens: [] };
  const ids = encode(text);
  const tokens = ids.map((id) => decode([id]));
  return {
    count: ids.length,
    costUsd: (ids.length / 1_000_000) * COST_PER_MTOK_USD,
    tokens,
  };
}
```

- [ ] **Step 4: Run tests to pass**

Run: `npx vitest run tests/tokenizer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): BPE tokenizer wrapper with count, chips, cost estimate"
```

---

### Task 5: Token optimizer (TDD)

**Files:**
- Create: `src/analysis/optimizer.ts`
- Test: `tests/optimizer.test.ts`

**Interfaces:**
- Consumes: `ScoringRules` (`fillers`), `OptimizerResult`, `OptimizerEdit` from types; `analyzeTokens` from Task 4.
- Produces: `optimizePrompt(text: string, rules: ScoringRules): OptimizerResult`. Applies each filler regex (case-insensitive, global), collapses double spaces, computes per-edit and total token deltas, and emits static formatting tips when heuristics fire.

- [ ] **Step 1: Write failing tests** — `tests/optimizer.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/optimizer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/analysis/optimizer.ts**

```ts
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
    const re = new RegExp(pattern, 'gi');
    if (!re.test(optimized)) continue;
    // token cost of this edit alone, measured against the current text
    const next = optimized.replace(re, replacement).replace(/ {2,}/g, ' ').replace(/^ +/gm, '');
    const saved = analyzeTokens(optimized).count - analyzeTokens(next).count;
    if (saved > 0) edits.push({ from: pattern.replace(/\\\.\??/g, '.'), to: replacement.trim() || '(removed)', tokensSaved: saved });
    optimized = next;
  }
  // Capitalise start of sentences that lost their opener (e.g. "please create" -> "create")
  optimized = optimized.replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());

  const tips = TIPS.filter((t) => t.test(text)).map((t) => t.tip);
  if (edits.length === 0) optimized = text; // no rewrites → return input verbatim

  return {
    original: text,
    optimized,
    originalTokens: analyzeTokens(text).count,
    optimizedTokens: analyzeTokens(optimized).count,
    edits,
    tips,
  };
}
```

- [ ] **Step 4: Run tests to pass**

Run: `npx vitest run tests/optimizer.test.ts`
Expected: PASS. (If the "already-tight" test fails because a filler like `very ` matches inside it, adjust the test prompt, not the engine — the sample above avoids all filler patterns.)

- [ ] **Step 5: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): token optimizer with filler removal, per-edit savings, formatting tips"
```

---

### Task 6: Simulation engine (TDD) — score drives everything

**Files:**
- Create: `src/sim/simulate.ts`
- Test: `tests/simulate.test.ts`

**Interfaces:**
- Consumes: `ScoreResult`, `Scenario`, `SimulationOutcome`, `Band` from types.
- Produces: `simulate(score: ScoreResult, scenario: Scenario, promptText: string, tokenCount: number): SimulationOutcome`. Fully deterministic (no `Math.random`): retrieval similarity = keyword overlap × band multiplier; hallucination risk, tool call, gauges, grade, and curated response text all derive from the band.

- [ ] **Step 1: Write failing tests** — `tests/simulate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/simulate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement src/sim/simulate.ts**

```ts
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
```

- [ ] **Step 4: Run tests to pass**

Run: `npx vitest run tests/simulate.test.ts`
Expected: PASS. (The bad aircraft prompt contains "AI rollout" but band-poor factor 0.3 keeps every similarity below 0.55 → all irrelevant; if a threshold test fails, tune `RELEVANT_THRESHOLD` or `BAND_FACTOR` — never the test.)

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test`
Expected: all suites PASS.

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): deterministic simulation engine driven by prompt score"
```

---

### Task 7: Timeline engine + Zustand store (TDD)

**Files:**
- Create: `src/engine/timeline.ts`, `src/store.ts`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Consumes: engines from Tasks 3–6; loaders from Task 2 (vitest supports `import.meta.glob`, so the store is testable directly).
- Produces (later UI tasks rely on these exact names):
  - `timeline.ts`: `RUN_DURATION_MS = 9000`, `advance(progress: number, dtMs: number, speed: number): number` (pure, clamps to 1), `stageIndexAt(progress: number): number` (0–5), `useTimeline(): void` (rAF hook that drives `tick` while playing).
  - `store.ts`: `useLab` zustand hook with state `{ mode: 'sandbox'|'learn'|'compare'|'cheatsheet'; theme: 'dark'|'light'; scenario: Scenario; variant: 'good'|'bad'|'custom'; promptText: string; score: ScoreResult; tokens: TokenInfo; optimizer: OptimizerResult; outcome: SimulationOutcome; playback: { status: 'idle'|'playing'|'paused'|'done'; progress: number; speed: number }; expandedStage: StageId | null }` and actions `setMode(m)`, `setTheme(t)`, `setPrompt(text)`, `setVariant(v)`, `run()`, `pause()`, `resetRun()`, `setSpeed(n)`, `tick(dtMs)`, `expandStage(id: StageId | null)`. `setPrompt` recomputes score/tokens/optimizer/outcome synchronously. Also exports `RULES: ScoringRules` and `SCENARIOS: Scenario[]` (loaded once at module scope).

- [ ] **Step 1: Write failing tests** — `tests/timeline.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { advance, stageIndexAt, RUN_DURATION_MS } from '../src/engine/timeline';
import { useLab } from '../src/store';

describe('advance', () => {
  it('progresses linearly with dt and speed', () => {
    expect(advance(0, RUN_DURATION_MS / 2, 1)).toBeCloseTo(0.5, 5);
    expect(advance(0, RUN_DURATION_MS / 2, 2)).toBeCloseTo(1, 5);
  });
  it('clamps at 1', () => { expect(advance(0.9, RUN_DURATION_MS, 1)).toBe(1); });
});

describe('stageIndexAt', () => {
  it('maps progress to six stages', () => {
    expect(stageIndexAt(0)).toBe(0);
    expect(stageIndexAt(0.34)).toBe(2);
    expect(stageIndexAt(0.999)).toBe(5);
    expect(stageIndexAt(1)).toBe(5);
  });
});

describe('store', () => {
  beforeEach(() => {
    const s = useLab.getState();
    s.setVariant('good');
    s.resetRun();
  });
  it('setPrompt recomputes score, tokens, outcome', () => {
    useLab.getState().setPrompt('help me with stuff');
    const s1 = useLab.getState();
    expect(s1.variant).toBe('custom');
    expect(s1.score.band).toBe('poor');
    expect(s1.tokens.count).toBeGreaterThan(0);
    useLab.getState().setVariant('good');
    const s2 = useLab.getState();
    expect(s2.promptText).toBe(s2.scenario.goodPrompt);
    expect(s2.score.band).toBe('excellent');
    expect(s2.outcome.tool.correct).toBe(true);
  });
  it('run/tick/pause lifecycle', () => {
    const s = useLab.getState();
    s.run();
    expect(useLab.getState().playback.status).toBe('playing');
    s.tick(RUN_DURATION_MS / 2);
    expect(useLab.getState().playback.progress).toBeCloseTo(0.5, 3);
    s.pause();
    expect(useLab.getState().playback.status).toBe('paused');
    s.tick(1000); // ignored while paused
    expect(useLab.getState().playback.progress).toBeCloseTo(0.5, 3);
    s.run();
    s.tick(RUN_DURATION_MS);
    expect(useLab.getState().playback.status).toBe('done');
    expect(useLab.getState().playback.progress).toBe(1);
  });
  it('setSpeed changes tick rate', () => {
    const s = useLab.getState();
    s.setSpeed(2);
    s.run();
    s.tick(RUN_DURATION_MS / 2);
    expect(useLab.getState().playback.progress).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement src/engine/timeline.ts**

```ts
import { useEffect } from 'react';
import { useLab } from '../store';

export const RUN_DURATION_MS = 9000;

export function advance(progress: number, dtMs: number, speed: number): number {
  return Math.min(1, progress + (dtMs / RUN_DURATION_MS) * speed);
}

export function stageIndexAt(progress: number): number {
  return Math.min(5, Math.floor(progress * 6));
}

/** Drives store.tick with requestAnimationFrame while playback.status === 'playing'. Mount once. */
export function useTimeline(): void {
  const status = useLab((s) => s.playback.status);
  useEffect(() => {
    if (status !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      useLab.getState().tick(now - last);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status]);
}
```

- [ ] **Step 4: Implement src/store.ts**

```ts
import { create } from 'zustand';
import type { OptimizerResult, Scenario, ScoreResult, SimulationOutcome, StageId, TokenInfo } from './types';
import { loadRules, loadScenarios } from './content/load';
import { scorePrompt } from './analysis/scorer';
import { analyzeTokens } from './analysis/tokenizer';
import { optimizePrompt } from './analysis/optimizer';
import { simulate } from './sim/simulate';
import { advance } from './engine/timeline';

export const RULES = loadRules();
export const SCENARIOS = loadScenarios();

type Mode = 'sandbox' | 'learn' | 'compare' | 'cheatsheet';
type Variant = 'good' | 'bad' | 'custom';
type Status = 'idle' | 'playing' | 'paused' | 'done';

interface LabState {
  mode: Mode; theme: 'dark' | 'light';
  scenario: Scenario; variant: Variant; promptText: string;
  score: ScoreResult; tokens: TokenInfo; optimizer: OptimizerResult; outcome: SimulationOutcome;
  playback: { status: Status; progress: number; speed: number };
  expandedStage: StageId | null;
  setMode: (m: Mode) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setPrompt: (text: string, variant?: Variant) => void;
  setVariant: (v: 'good' | 'bad') => void;
  run: () => void; pause: () => void; resetRun: () => void;
  setSpeed: (n: number) => void; tick: (dtMs: number) => void;
  expandStage: (id: StageId | null) => void;
}

function derive(text: string, scenario: Scenario) {
  const score = scorePrompt(text, RULES);
  const tokens = analyzeTokens(text);
  return {
    score, tokens,
    optimizer: optimizePrompt(text, RULES),
    outcome: simulate(score, scenario, text, tokens.count),
  };
}

const initialScenario = SCENARIOS[0];

export const useLab = create<LabState>((set, get) => ({
  mode: 'sandbox', theme: 'dark',
  scenario: initialScenario, variant: 'good', promptText: initialScenario.goodPrompt,
  ...derive(initialScenario.goodPrompt, initialScenario),
  playback: { status: 'idle', progress: 0, speed: 1 },
  expandedStage: null,

  setMode: (mode) => set({ mode }),
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  setPrompt: (promptText, variant = 'custom') =>
    set({ promptText, variant, ...derive(promptText, get().scenario) }),
  setVariant: (v) => {
    const text = v === 'good' ? get().scenario.goodPrompt : get().scenario.badPrompt;
    set({ variant: v, promptText: text, ...derive(text, get().scenario), playback: { ...get().playback, status: 'idle', progress: 0 } });
  },
  run: () => set((s) => ({
    playback: { ...s.playback, status: 'playing', progress: s.playback.status === 'done' ? 0 : s.playback.progress },
  })),
  pause: () => set((s) => ({ playback: { ...s.playback, status: 'paused' } })),
  resetRun: () => set((s) => ({ playback: { ...s.playback, status: 'idle', progress: 0 } })),
  setSpeed: (speed) => set((s) => ({ playback: { ...s.playback, speed } })),
  tick: (dtMs) => set((s) => {
    if (s.playback.status !== 'playing') return s;
    const progress = advance(s.playback.progress, dtMs, s.playback.speed);
    return { playback: { ...s.playback, progress, status: progress >= 1 ? 'done' : 'playing' } };
  }),
  expandStage: (expandedStage) => set({ expandedStage }),
}));
```

Note: `setTheme` touches `document` — tests don't call it (jsdom not needed; environment stays `node`).

- [ ] **Step 5: Run tests to pass**

Run: `npx vitest run tests/timeline.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): rAF timeline engine and zustand lab store"
```

---

### Task 8: Pipeline canvas, stage registry, six stage cards

**Files:**
- Create: `src/pipeline/registry.ts`, `src/pipeline/Canvas.tsx`, `src/pipeline/Particles.tsx`, `src/pipeline/stages/AnalyzerStage.tsx`, `src/pipeline/stages/TokenizerStage.tsx`, `src/pipeline/stages/RagStage.tsx`, `src/pipeline/stages/LlmStage.tsx`, `src/pipeline/stages/McpStage.tsx`, `src/pipeline/stages/ResponseStage.tsx`, `src/pipeline/pipeline.css`
- Modify: `src/app/App.tsx` (render Canvas temporarily), `src/main.tsx` (import pipeline.css after tokens.css)

**Interfaces:**
- Consumes: `useLab` store, `stageIndexAt`, `useTimeline` (Task 7), CSS tokens (Task 1).
- Produces: `stageRegistry: StageDef[]` where `interface StageProps { revealed: boolean }` and `interface StageDef { id: StageId; title: string; colorVar: string; order: number; Card: React.FC<StageProps>; Expanded: React.FC<StageProps> }`; `<PipelineCanvas />` component. Each `XxxStage.tsx` exports `{ Card, Expanded }`. Stage k is `revealed` when `playback.progress * 6 > k + 0.5` or status is `done`; the card under the particle head gets class `active`.

- [ ] **Step 1: Create src/pipeline/pipeline.css** (canvas grid, serpentine layout, cards, wires, particles — matches approved mockup)

```css
.canvas { position: relative; height: 560px; overflow: hidden; background:
    radial-gradient(1200px 500px at 60% -10%, rgba(83,214,240,.05), transparent 60%),
    repeating-linear-gradient(0deg, transparent 0 39px, rgba(36,48,79,.35) 39px 40px),
    repeating-linear-gradient(90deg, transparent 0 39px, rgba(36,48,79,.35) 39px 40px),
    var(--bg); }
.stage-grid { position: absolute; inset: 0; display: grid; gap: 60px 40px; padding: 40px;
  grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
/* serpentine order: row1 L→R = stages 0,1,2 · row2 R→L = 3,4,5 */
.slot-0 { grid-area: 1 / 1; } .slot-1 { grid-area: 1 / 2; } .slot-2 { grid-area: 1 / 3; }
.slot-3 { grid-area: 2 / 3; } .slot-4 { grid-area: 2 / 2; } .slot-5 { grid-area: 2 / 1; }
.stage-card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  overflow: hidden; text-align: left; padding: 0; width: 100%; display: flex; flex-direction: column;
  box-shadow: 0 10px 30px -14px rgba(0,0,0,.7); transition: box-shadow .3s, opacity .3s; opacity: .55; }
.stage-card.revealed { opacity: 1; }
.stage-card.active { box-shadow: 0 0 0 1px var(--stage-color), 0 0 34px -6px var(--stage-color); }
.stage-card:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.stage-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  border-bottom: 1px solid var(--line2); font-family: var(--mono); font-size: 11.5px;
  letter-spacing: .08em; font-weight: 700; color: var(--stage-color); }
.stage-head .n { margin-left: auto; font-weight: 400; color: var(--dim); font-size: 10px; }
.swatch { width: 8px; height: 8px; border-radius: 2px; background: var(--stage-color); flex: none; }
.stage-body { padding: 10px 12px; font-family: var(--mono); font-size: 11px; color: var(--mut);
  display: flex; flex-direction: column; gap: 7px; flex: 1; }
.badges { display: flex; gap: 5px; flex-wrap: wrap; }
.bdg { border-radius: 5px; padding: 2px 7px; font-size: 10.5px; font-weight: 700; }
.bdg.y { background: rgba(67,222,155,.12); color: var(--green); box-shadow: inset 0 0 0 1px rgba(67,222,155,.35); }
.bdg.n { background: rgba(242,109,133,.1); color: var(--red); box-shadow: inset 0 0 0 1px rgba(242,109,133,.35); }
.stat { display: flex; justify-content: space-between; }
.stat b { color: var(--ink); font-weight: 600; }
.tokens-strip { display: flex; flex-wrap: wrap; gap: 3px; max-height: 40px; overflow: hidden; }
.tk { border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #062229; }
.tk:nth-child(4n+1){background:#53D6F0}.tk:nth-child(4n+2){background:#3FB2D8}
.tk:nth-child(4n+3){background:#7BE3F4}.tk:nth-child(4n){background:#2E93BE}
.chunk { display: flex; align-items: center; gap: 7px; }
.chunk .bar { flex: 1; height: 7px; border-radius: 4px; background: var(--inset); overflow: hidden; }
.chunk .bar i { display: block; height: 100%; border-radius: 4px; }
.ctx { display: flex; height: 12px; border-radius: 5px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--line2); }
.ctx i { display: block; height: 100%; }
.gauges { display: flex; gap: 10px; justify-content: space-around; }
.wires { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.wire { stroke: var(--line); stroke-width: 2; fill: none; }
.particle { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: var(--cyan);
  box-shadow: 0 0 9px 2px rgba(83,214,240,.7); offset-rotate: 0deg;
  offset-path: path('M -10 155 H 870 V 425 H 30'); animation: flow 3s linear infinite; }
.particle.alt { background: var(--violet); box-shadow: 0 0 9px 2px rgba(157,140,255,.7); }
@keyframes flow { 0% { offset-distance: 0%; opacity: 0 } 5% { opacity: 1 } 95% { opacity: 1 } 100% { offset-distance: 100%; opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .particle { animation: none; display: none; } }
```

- [ ] **Step 2: Create the six stage files.** Every file follows the same shape: exports `Card` and `Expanded` (both `React.FC<{ revealed: boolean }>`), reads from `useLab`. Complete code:

`src/pipeline/stages/AnalyzerStage.tsx`:
```tsx
import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const score = useLab((s) => s.score);
  if (!revealed) return <div className="stage-body">Waiting for prompt…</div>;
  return (
    <div className="stage-body">
      <div className="badges">
        {score.elements.map((e) => (
          <span key={e.element} className={`bdg ${e.present ? 'y' : 'n'}`}>
            {e.element} {e.present ? '✓' : '✗'}
          </span>
        ))}
      </div>
      <div className="stat"><span>quality score</span><b>{score.score}/100 · {score.band}</b></div>
      {score.flags.length > 0 && <div className="stat"><span>flags</span><b>{score.flags.map((f) => f.label).join(' · ')}</b></div>}
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const score = useLab((s) => s.score);
  return (
    <div className="expanded-body">
      <p>The Analyzer checks your prompt for the seven elements of the PTCF+ framework. Present elements add their weight to the score; flags subtract; bonuses add.</p>
      <table className="detail-table">
        <thead><tr><th>Element</th><th>Weight</th><th>Found</th><th>Evidence / tip</th></tr></thead>
        <tbody>
          {score.elements.map((e) => (
            <tr key={e.element}>
              <td>{e.element}</td><td>{e.weight}</td>
              <td>{e.present ? '✓' : '✗'}</td>
              <td>{e.present ? `"${e.evidence}"` : e.tip}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {score.flags.map((f) => (
        <p key={f.id} className="flag-line">⚠ <b>{f.label}</b> (−{f.penalty}): matched {f.matches.map((m) => `"${m}"`).join(', ')}. {f.advice}</p>
      ))}
      {score.bonuses.map((b) => (<p key={b.id} className="bonus-line">★ <b>{b.label}</b> (+{b.points})</p>))}
    </div>
  );
}
```

`src/pipeline/stages/TokenizerStage.tsx`:
```tsx
import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const tokens = useLab((s) => s.tokens);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <div className="tokens-strip">{tokens.tokens.slice(0, 14).map((t, i) => (<span key={i} className="tk">{t}</span>))}{tokens.count > 14 && <span className="tk">…</span>}</div>
      <div className="stat"><span>tokens</span><b>{tokens.count}</b></div>
      <div className="stat"><span>est. cost</span><b>${tokens.costUsd.toFixed(6)}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { tokens, optimizer } = useLab((s) => ({ tokens: s.tokens, optimizer: s.optimizer }));
  return (
    <div className="expanded-body">
      <p>Models read tokens, not words (~¾ of a word each). You pay per token — in money, latency, and context-window space. Estimated at a typical small model's input rate.</p>
      <div className="tokens-strip expanded">{tokens.tokens.map((t, i) => (<span key={i} className="tk">{t}</span>))}</div>
      <h4>Optimizer — save {optimizer.originalTokens - optimizer.optimizedTokens} tokens</h4>
      {optimizer.edits.length === 0 && <p>Nothing to trim — this prompt is already tight. ✓</p>}
      {optimizer.edits.map((e, i) => (<p key={i} className="edit-line">“{e.from}” → {e.to === '(removed)' ? 'remove' : `“${e.to}”`} <b>−{e.tokensSaved} tok</b></p>))}
      {optimizer.tips.map((t, i) => (<p key={i} className="tip-line">💡 {t}</p>))}
    </div>
  );
}
```

`src/pipeline/stages/RagStage.tsx`:
```tsx
import { useLab } from '../../store';

const barColor = (sim: number) => (sim >= 0.55 ? 'var(--green)' : sim >= 0.35 ? 'var(--amber)' : 'var(--red)');

export function Card({ revealed }: { revealed: boolean }) {
  const retrieval = useLab((s) => s.outcome.retrieval);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      {retrieval.map((r) => (
        <div key={r.docId} className="chunk">
          <span>{r.docId}</span>
          <span className="bar"><i style={{ width: `${r.similarity * 100}%`, background: barColor(r.similarity) }} /></span>
          <b style={{ color: barColor(r.similarity) }}>{r.similarity.toFixed(2)}</b>
        </div>
      ))}
      <div className="stat"><span>top-k retrieved</span><b>{retrieval.filter((r) => r.relevant).length} relevant</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { retrieval, scenario } = useLab((s) => ({ retrieval: s.outcome.retrieval, scenario: s.scenario }));
  return (
    <div className="expanded-body">
      <p>RAG embeds your prompt into numbers and searches the document index for the nearest chunks. Specific keywords ("aircraft manuals", "adoption strategy") land near the right documents; vague words land nowhere useful — garbage in, garbage retrieved.</p>
      <ol className="rag-steps"><li>Embed prompt → vector</li><li>Similarity search over {scenario.documents.length} indexed docs</li><li>Top-3 chunks pasted into the context window</li></ol>
      {retrieval.map((r) => (
        <p key={r.docId} className={r.relevant ? 'bonus-line' : 'flag-line'}>
          {r.relevant ? '✓' : '✗'} <b>{r.title}</b> — similarity {r.similarity.toFixed(2)} {r.relevant ? '(passed to the model)' : '(noise)'}
        </p>
      ))}
    </div>
  );
}
```

`src/pipeline/stages/LlmStage.tsx`:
```tsx
import { useLab } from '../../store';

const RISK_COLOR = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)' } as const;

export function Card({ revealed }: { revealed: boolean }) {
  const { contextWindow: cw, hallucinationRisk: risk } = useLab((s) => s.outcome);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <span style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)' }}>context window</span>
      <div className="ctx">
        <i style={{ width: `${cw.systemPct}%`, background: '#3A4C86' }} />
        <i style={{ width: `${cw.ragPct}%`, background: '#B98A38' }} />
        <i style={{ width: `${cw.promptPct}%`, background: '#2E93BE' }} />
      </div>
      <div className="stat"><span style={{ color: '#7C8FC7' }}>■ system</span><span style={{ color: 'var(--amber)' }}>■ RAG</span><span style={{ color: 'var(--cyan)' }}>■ prompt</span></div>
      <div className="stat"><span>halluc. risk</span><b style={{ color: RISK_COLOR[risk] }}>{risk}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { contextWindow: cw, hallucinationRisk: risk } = useLab((s) => s.outcome);
  return (
    <div className="expanded-body">
      <p>Everything the model sees is one stacked context window: the app's system prompt ({cw.systemPct}%), retrieved chunks ({cw.ragPct}%), and your prompt ({cw.promptPct}%). The model attends over all of it and predicts one token at a time.</p>
      <p>When the prompt is vague and retrieval is noisy, the model still <em>must</em> answer — it fills gaps from statistical patterns. That's a hallucination: current risk <b style={{ color: RISK_COLOR[risk] }}>{risk}</b>.</p>
      <p>💡 Front-load role and task — early tokens anchor the model's plan for the whole answer. Trigger phrases like "let's think step-by-step" activate stronger reasoning patterns.</p>
    </div>
  );
}
```

`src/pipeline/stages/McpStage.tsx`:
```tsx
import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const { tool } = useLab((s) => s.outcome);
  const tools = useLab((s) => s.scenario.tools);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      {tools.map((t) => {
        const selected = tool.called && tool.name === t.name;
        return (
          <div key={t.name} className="stat" style={selected ? { color: 'var(--ink)' } : undefined}>
            <span>{selected ? '▸ ' : ''}{t.name}({selected ? tool.args : ''})</span>
            {selected && <b style={{ color: tool.correct ? 'var(--magenta)' : 'var(--red)' }}>{tool.correct ? '✓' : 'wrong tool'}</b>}
          </div>
        );
      })}
      <div className="stat"><span>tool match</span><b>{tool.called ? (tool.correct ? 'correct · params ok' : 'incorrect guess') : 'no call — task unclear'}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { tool } = useLab((s) => s.outcome);
  const tools = useLab((s) => s.scenario.tools);
  return (
    <div className="expanded-body">
      <p>Via MCP (Model Context Protocol) the model discovers available tools and decides — from your prompt alone — whether to call one, which, and with what arguments. A clear task with specific keywords becomes a correct call; a vague one becomes a guess or no call at all.</p>
      {tools.map((t) => (<p key={t.name} className="stat"><span><b>{t.name}</b> — {t.description}</span></p>))}
      <p className={tool.correct ? 'bonus-line' : 'flag-line'}>
        {tool.called ? `Model called ${tool.name}(${tool.args}) — ${tool.correct ? 'exactly right.' : 'a guess, because the task was underspecified.'}` : 'Model made no tool call: it couldn\'t tell what action you wanted.'}
      </p>
    </div>
  );
}
```

`src/pipeline/stages/ResponseStage.tsx`:
```tsx
import { useLab } from '../../store';
import { Gauge } from '../../components/Gauge';

export function Card({ revealed }: { revealed: boolean }) {
  const { response } = useLab((s) => s.outcome);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <div className="gauges">
        <Gauge label="relevance" value={response.relevance} color="var(--green)" />
        <Gauge label="complete" value={response.completeness} color="var(--green)" />
        <Gauge label="safety" value={response.safety} color="var(--cyan)" />
      </div>
      <div className="stat"><span>grade</span><b>{response.grade}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { response } = useLab((s) => s.outcome);
  return (
    <div className="expanded-body">
      <pre className="response-text">{response.text}</pre>
      <h4>Next steps (iterate — don't expect perfection first try)</h4>
      {response.nextSteps.map((n, i) => (<p key={i} className="tip-line">↺ {n}</p>))}
    </div>
  );
}
```

- [ ] **Step 3: Create src/components/Gauge.tsx**

```tsx
export function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        position: 'relative', width: 40, height: 40, borderRadius: '50%', margin: '0 auto 4px',
        background: `conic-gradient(${color} 0 ${value}%, var(--inset) 0)`,
      }}>
        <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: 'var(--panel)' }} />
        <b style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 10, color }}>{value}</b>
      </div>
      <span style={{ fontSize: 9, letterSpacing: '.08em', color: 'var(--dim)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
```

- [ ] **Step 4: Create src/pipeline/registry.ts**

```ts
import type { ComponentType } from 'react';
import type { StageId } from '../types';
import * as Analyzer from './stages/AnalyzerStage';
import * as Tokenizer from './stages/TokenizerStage';
import * as Rag from './stages/RagStage';
import * as Llm from './stages/LlmStage';
import * as Mcp from './stages/McpStage';
import * as Response from './stages/ResponseStage';

export interface StageProps { revealed: boolean }
export interface StageDef {
  id: StageId; title: string; colorVar: string; order: number;
  Card: ComponentType<StageProps>; Expanded: ComponentType<StageProps>;
}

export const stageRegistry: StageDef[] = [
  { id: 'analyzer', title: 'PROMPT ANALYZER', colorVar: 'var(--violet)', order: 0, ...Analyzer },
  { id: 'tokenizer', title: 'TOKENIZER', colorVar: 'var(--cyan)', order: 1, ...Tokenizer },
  { id: 'rag', title: 'RAG RETRIEVAL', colorVar: 'var(--amber)', order: 2, ...Rag },
  { id: 'llm', title: 'LLM CORE', colorVar: 'var(--blue)', order: 3, ...Llm },
  { id: 'mcp', title: 'TOOLS / MCP', colorVar: 'var(--magenta)', order: 4, ...Mcp },
  { id: 'response', title: 'RESPONSE', colorVar: 'var(--green)', order: 5, ...Response },
];
```

- [ ] **Step 5: Create src/pipeline/Particles.tsx and src/pipeline/Canvas.tsx**

`src/pipeline/Particles.tsx`:
```tsx
import { useLab } from '../store';

export function Particles() {
  const playing = useLab((s) => s.playback.status === 'playing');
  if (!playing) return null;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={`particle ${i % 3 === 2 ? 'alt' : ''}`} style={{ animationDelay: `${i * 0.6}s` }} aria-hidden />
      ))}
    </>
  );
}
```

`src/pipeline/Canvas.tsx`:
```tsx
import type { CSSProperties } from 'react';
import { useLab } from '../store';
import { stageIndexAt } from '../engine/timeline';
import { stageRegistry } from './registry';
import { Particles } from './Particles';

export function PipelineCanvas() {
  const { status, progress } = useLab((s) => s.playback);
  const expandStage = useLab((s) => s.expandStage);
  const activeIdx = status === 'playing' ? stageIndexAt(progress) : -1;
  const revealedThrough = status === 'done' ? 6 : progress * 6 - 0.5;

  return (
    <div className="canvas">
      <svg className="wires" viewBox="0 0 900 560" preserveAspectRatio="none" aria-hidden>
        <path className="wire" d="M 290 155 H 320" /><path className="wire" d="M 580 155 H 610" />
        <path className="wire" d="M 750 250 V 310" />
        <path className="wire" d="M 610 425 H 580" /><path className="wire" d="M 320 425 H 290" />
      </svg>
      <Particles />
      <div className="stage-grid">
        {stageRegistry.map((def) => {
          const revealed = def.order < revealedThrough || status === 'done' || status === 'idle';
          return (
            <button
              key={def.id}
              className={`stage-card slot-${def.order} ${revealed ? 'revealed' : ''} ${activeIdx === def.order ? 'active' : ''}`}
              style={{ '--stage-color': def.colorVar } as CSSProperties}
              onClick={() => expandStage(def.id)}
              aria-label={`Open ${def.title} details`}
            >
              <span className="stage-head"><span className="swatch" />{def.title}<span className="n">stage {def.order + 1}/6</span></span>
              <def.Card revealed={revealed} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire into App temporarily and verify**

`src/app/App.tsx`:
```tsx
import { PipelineCanvas } from '../pipeline/Canvas';
import { useTimeline } from '../engine/timeline';
import { useLab } from '../store';

export default function App() {
  useTimeline();
  const run = useLab((s) => s.run);
  return (
    <div>
      <button onClick={run} style={{ margin: 12, color: 'var(--cyan)', fontFamily: 'var(--mono)' }}>▶ RUN</button>
      <PipelineCanvas />
    </div>
  );
}
```

`src/main.tsx` — add `import './pipeline/pipeline.css';` after the tokens.css import.

Run: `npm run build` (expect success) then `npm run dev` — open the shown URL: six stage cards render in serpentine layout with live good-prompt data; clicking ▶ RUN animates particles and reveals stages progressively.

- [ ] **Step 7: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): pipeline canvas with stage registry, six stage cards, particle flow"
```

---

### Task 9: Sandbox mode — app shell, composer, transport, stage overlay

**Files:**
- Create: `src/components/TopBar.tsx`, `src/components/StageOverlay.tsx`, `src/modes/Composer.tsx`, `src/modes/Transport.tsx`, `src/modes/Sandbox.tsx`, `src/app/useHashMode.ts`, `src/app/app.css`
- Modify: `src/app/App.tsx` (real shell), `src/main.tsx` (import app.css)

**Interfaces:**
- Consumes: store + registry + canvas from Tasks 7–8.
- Produces: `<TopBar />` (tabs Learn/Sandbox/Cheat Sheet, theme toggle, settings button with `onSettings?: () => void` prop), `<Sandbox />` (grid: Composer | Canvas, Transport below), `<StageOverlay />` (modal rendering the expanded view of `expandedStage`, Esc/backdrop closes), `useHashMode(): void` (syncs `location.hash` `#/learn #/sandbox #/compare #/cheatsheet` ↔ `store.mode`, both directions).

- [ ] **Step 1: Create src/app/app.css**

```css
.topbar { display: flex; align-items: center; gap: 20px; padding: 10px 20px; border-bottom: 1px solid var(--line2); background: var(--panel2); }
.logo { font-family: var(--mono); font-weight: 700; font-size: 15px; }
.logo b { color: var(--cyan); }
.tabs { display: flex; gap: 4px; background: var(--inset); border: 1px solid var(--line2); border-radius: 9px; padding: 3px; }
.tab { font-family: var(--mono); font-size: 12.5px; padding: 6px 16px; border-radius: 6px; color: var(--mut); }
.tab.on { background: var(--panel); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line); }
.topbar .right { margin-left: auto; display: flex; gap: 12px; align-items: center; font-family: var(--mono); font-size: 12px; color: var(--mut); }
.sandbox { display: grid; grid-template-columns: 330px 1fr; min-height: 560px; }
.composer { border-right: 1px solid var(--line2); padding: 16px; display: flex; flex-direction: column; gap: 14px; background: var(--panel2); }
.lbl { font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--dim); }
.promptbox { background: var(--inset); border: 1px solid var(--line); border-radius: 10px; padding: 12px;
  font-family: var(--mono); font-size: 12px; color: var(--ink); line-height: 1.65; min-height: 170px; width: 100%; resize: vertical; }
.promptbox:focus-visible { outline: 2px solid var(--cyan); }
.checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.chk { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 12px; background: var(--inset);
  border: 1px solid var(--line2); border-radius: 8px; padding: 7px 10px; color: var(--mut); }
.chk.ok { color: var(--ink); }
.chk .m { width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; flex: none; }
.chk.ok .m { background: rgba(67,222,155,.15); color: var(--green); box-shadow: 0 0 0 1px rgba(67,222,155,.4); }
.chk.miss .m { background: rgba(242,109,133,.12); color: var(--red); box-shadow: 0 0 0 1px rgba(242,109,133,.4); }
.opt-tip { display: flex; gap: 10px; background: rgba(242,185,79,.07); border: 1px solid rgba(242,185,79,.3);
  border-radius: 10px; padding: 10px 12px; font-size: 12.5px; }
.opt-tip b { color: var(--amber); font-family: var(--mono); }
.runbtn { margin-top: auto; background: linear-gradient(180deg, #1E7A8C, #155E6E); border: 1px solid #2FA3BC; color: #EAFBFF;
  font-family: var(--mono); font-size: 13px; font-weight: 700; letter-spacing: .06em; border-radius: 10px; padding: 12px; }
.runbtn:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.transport { display: flex; align-items: center; gap: 16px; border-top: 1px solid var(--line2); background: var(--panel2);
  padding: 10px 20px; font-family: var(--mono); font-size: 12px; color: var(--mut); }
.tbtn { width: 34px; height: 30px; display: grid; place-items: center; background: var(--inset); border: 1px solid var(--line);
  border-radius: 7px; color: var(--ink); font-size: 12px; }
.tbtn.play { background: rgba(83,214,240,.12); border-color: rgba(83,214,240,.5); color: var(--cyan); }
.gvb { display: flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin-left: auto; }
.gvb button { padding: 6px 14px; font-size: 11.5px; font-family: var(--mono); color: var(--dim); }
.gvb button.sel-good { background: rgba(67,222,155,.14); color: var(--green); font-weight: 700; }
.gvb button.sel-bad { background: rgba(242,109,133,.14); color: var(--red); font-weight: 700; }
.overlay { position: fixed; inset: 0; background: rgba(4,8,18,.7); display: grid; place-items: center; z-index: 50; }
.overlay-card { width: min(640px, 92vw); max-height: 84vh; overflow-y: auto; background: var(--panel);
  border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 30px 70px -20px rgba(0,0,0,.85); }
.overlay-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line2);
  font-family: var(--mono); font-weight: 700; letter-spacing: .08em; color: var(--stage-color); position: sticky; top: 0; background: var(--panel); }
.overlay-head .x { margin-left: auto; color: var(--mut); font-size: 16px; }
.expanded-body { padding: 16px; font-size: 13.5px; color: var(--mut); display: flex; flex-direction: column; gap: 10px; }
.expanded-body h4 { margin: 6px 0 0; color: var(--ink); font-size: 13px; }
.expanded-body p { margin: 0; }
.detail-table { border-collapse: collapse; font-family: var(--mono); font-size: 11.5px; width: 100%; }
.detail-table th, .detail-table td { border: 1px solid var(--line2); padding: 5px 8px; text-align: left; }
.flag-line { color: var(--red); } .bonus-line { color: var(--green); } .tip-line { color: var(--amber); }
.edit-line { font-family: var(--mono); font-size: 12px; } .edit-line b { color: var(--green); }
.response-text { white-space: pre-wrap; font-family: var(--mono); font-size: 11.5px; background: var(--inset);
  border: 1px solid var(--line2); border-radius: 8px; padding: 12px; color: var(--ink); overflow-x: auto; }
```

- [ ] **Step 2: Create src/app/useHashMode.ts**

```ts
import { useEffect } from 'react';
import { useLab } from '../store';

const MODES = ['learn', 'sandbox', 'compare', 'cheatsheet'] as const;
type Mode = (typeof MODES)[number];

export function useHashMode(): void {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.replace('#/', '') as Mode;
      if (MODES.includes(h) && h !== useLab.getState().mode) setMode(h);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [setMode]);
  useEffect(() => { location.hash = `#/${mode}`; }, [mode]);
}
```

- [ ] **Step 3: Create src/components/TopBar.tsx**

```tsx
import { useLab } from '../store';

const TABS = [
  { mode: 'learn', label: '📖 Learn' },
  { mode: 'sandbox', label: '🧪 Sandbox' },
  { mode: 'compare', label: '⇅ Compare' },
  { mode: 'cheatsheet', label: '📋 Cheat Sheet' },
] as const;

export function TopBar({ onSettings }: { onSettings?: () => void }) {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  const theme = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);
  return (
    <header className="topbar">
      <span className="logo">⚡ Prompt<b>Lab</b></span>
      <nav className="tabs" aria-label="Mode">
        {TABS.map((t) => (
          <button key={t.mode} className={`tab ${mode === t.mode ? 'on' : ''}`} onClick={() => setMode(t.mode)}>{t.label}</button>
        ))}
      </nav>
      <span className="right">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '🌙'}</button>
        {onSettings && <button onClick={onSettings} aria-label="Settings">⚙</button>}
      </span>
    </header>
  );
}
```

- [ ] **Step 4: Create src/components/StageOverlay.tsx**

```tsx
import { useEffect, type CSSProperties } from 'react';
import { useLab } from '../store';
import { stageRegistry } from '../pipeline/registry';

export function StageOverlay() {
  const expanded = useLab((s) => s.expandedStage);
  const expandStage = useLab((s) => s.expandStage);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') expandStage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandStage]);
  if (!expanded) return null;
  const def = stageRegistry.find((d) => d.id === expanded)!;
  return (
    <div className="overlay" onClick={() => expandStage(null)} role="dialog" aria-modal="true" aria-label={def.title}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head" style={{ '--stage-color': def.colorVar } as CSSProperties}>
          <span className="swatch" />{def.title}
          <button className="x" onClick={() => expandStage(null)} aria-label="Close">✕</button>
        </div>
        <def.Expanded revealed />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create src/modes/Composer.tsx**

```tsx
import { useLab } from '../store';

export function Composer() {
  const { promptText, score, tokens, optimizer } = useLab((s) => ({
    promptText: s.promptText, score: s.score, tokens: s.tokens, optimizer: s.optimizer,
  }));
  const setPrompt = useLab((s) => s.setPrompt);
  const run = useLab((s) => s.run);
  const resetRun = useLab((s) => s.resetRun);
  const saved = optimizer.originalTokens - optimizer.optimizedTokens;
  return (
    <aside className="composer">
      <div>
        <label className="lbl" htmlFor="prompt-input">Your prompt · {tokens.count} tokens</label>
        <textarea id="prompt-input" className="promptbox" value={promptText}
          onChange={(e) => { setPrompt(e.target.value); resetRun(); }} />
      </div>
      <div>
        <div className="lbl" style={{ marginBottom: 6 }}>Prompt elements — score {score.score}/100 · {score.band}</div>
        <div className="checks">
          {score.elements.map((e) => (
            <span key={e.element} className={`chk ${e.present ? 'ok' : 'miss'}`} title={e.present ? e.evidence : e.tip}>
              <span className="m">{e.present ? '✓' : '✗'}</span>{e.element}
            </span>
          ))}
        </div>
      </div>
      {saved > 0 && (
        <div className="opt-tip">💡<div><b>Save {saved} tokens:</b> {optimizer.edits.slice(0, 2).map((e) => `“${e.from}” → ${e.to}`).join('; ')}. Open the Tokenizer stage for the full diff.</div></div>
      )}
      <button className="runbtn" onClick={run}>▶ RUN THROUGH PIPELINE</button>
    </aside>
  );
}
```

- [ ] **Step 6: Create src/modes/Transport.tsx**

```tsx
import { useLab } from '../store';

export function Transport() {
  const { status, speed } = useLab((s) => s.playback);
  const { variant } = useLab((s) => ({ variant: s.variant }));
  const { run, pause, resetRun, setSpeed, setVariant, setMode } = useLab((s) => ({
    run: s.run, pause: s.pause, resetRun: s.resetRun, setSpeed: s.setSpeed, setVariant: s.setVariant, setMode: s.setMode,
  }));
  return (
    <footer className="transport">
      <button className="tbtn play" onClick={status === 'playing' ? pause : run} aria-label={status === 'playing' ? 'Pause' : 'Play'}>
        {status === 'playing' ? '⏸' : '▶'}
      </button>
      <button className="tbtn" onClick={resetRun} aria-label="Reset">⏮</button>
      <label>speed
        <input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /> {speed}×
      </label>
      <div className="gvb" role="group" aria-label="Prompt variant">
        <button className={variant === 'good' ? 'sel-good' : ''} onClick={() => setVariant('good')}>GOOD PROMPT</button>
        <button className={variant === 'bad' ? 'sel-bad' : ''} onClick={() => setVariant('bad')}>BAD PROMPT</button>
      </div>
      <button className="tbtn" style={{ width: 'auto', padding: '0 12px' }} onClick={() => setMode('compare')}>⇅ Compare A/B</button>
    </footer>
  );
}
```

- [ ] **Step 7: Create src/modes/Sandbox.tsx and final App shell**

`src/modes/Sandbox.tsx`:
```tsx
import { Composer } from './Composer';
import { Transport } from './Transport';
import { PipelineCanvas } from '../pipeline/Canvas';

export function Sandbox() {
  return (
    <>
      <div className="sandbox">
        <Composer />
        <PipelineCanvas />
      </div>
      <Transport />
    </>
  );
}
```

`src/app/App.tsx` (replaces temporary version; Learn/Compare/CheatSheet placeholders will be filled by Tasks 10–11):
```tsx
import { useLab } from '../store';
import { useTimeline } from '../engine/timeline';
import { useHashMode } from './useHashMode';
import { TopBar } from '../components/TopBar';
import { StageOverlay } from '../components/StageOverlay';
import { Sandbox } from '../modes/Sandbox';

export default function App() {
  useTimeline();
  useHashMode();
  const mode = useLab((s) => s.mode);
  return (
    <div>
      <TopBar />
      {mode === 'sandbox' && <Sandbox />}
      {mode !== 'sandbox' && <div style={{ padding: 40, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{mode} — coming in the next task</div>}
      <StageOverlay />
    </div>
  );
}
```

`src/main.tsx` — add `import './app/app.css';` after pipeline.css.

- [ ] **Step 8: Verify**

Run: `npm run build` → success. `npm run dev` → typing in the composer updates badges/score/token count live; RUN animates; GOOD/BAD toggle swaps prompts; clicking a stage opens its expanded overlay; Esc closes; theme toggle works; `#/sandbox` hash appears.

- [ ] **Step 9: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): sandbox mode with composer, transport, stage overlays, hash routing"
```

---

### Task 10: Compare mode (A/B split-screen)

**Files:**
- Create: `src/modes/Compare.tsx`, append styles to `src/app/app.css`
- Modify: `src/app/App.tsx` (route `compare`)

**Interfaces:**
- Consumes: `RULES`, store scenario, `scorePrompt`, `analyzeTokens`, `simulate` (pure engines — Compare computes both lanes locally, no store playback needed).
- Produces: `<Compare />` — two lanes (good/bad) with mini-stage chips that light up sequentially via CSS animation delays, outcome grade cards, and per-lane prompt text.

- [ ] **Step 1: Append to src/app/app.css**

```css
.cmp-lane { display: grid; grid-template-columns: 260px 1fr 240px; border-bottom: 1px solid var(--line2); }
.cl-prompt { padding: 16px; border-right: 1px solid var(--line2); font-family: var(--mono); font-size: 11.5px; line-height: 1.6; color: var(--mut); }
.cl-prompt .tag { display: inline-block; border-radius: 5px; padding: 2px 8px; font-size: 10px; font-weight: 800; letter-spacing: .1em; margin-bottom: 8px; }
.lane-good .tag { background: rgba(67,222,155,.14); color: var(--green); }
.lane-bad .tag { background: rgba(242,109,133,.12); color: var(--red); }
.cl-flow { display: flex; align-items: center; gap: 10px; padding: 16px 18px; }
.mini { flex: 1; background: var(--panel); border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px;
  font-family: var(--mono); font-size: 10px; text-align: center; color: var(--mut); opacity: .35; animation: lane-light .4s forwards; }
.mini:nth-child(1){animation-delay:.2s}.mini:nth-child(3){animation-delay:1s}.mini:nth-child(5){animation-delay:1.8s}
.mini:nth-child(7){animation-delay:2.6s}.mini:nth-child(9){animation-delay:3.4s}
@keyframes lane-light { to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .mini { animation: none; opacity: 1; } }
.mini b { display: block; font-size: 10.5px; letter-spacing: .06em; margin-bottom: 3px; color: var(--ink); }
.lane-good .mini .v { color: var(--green); } .lane-bad .mini .v { color: var(--red); }
.cl-arrow { color: var(--line); font-size: 13px; flex: none; }
.cl-out { padding: 16px; border-left: 1px solid var(--line2); font-size: 12.5px; }
.cl-out .big { font-family: var(--mono); font-size: 24px; font-weight: 800; }
.lane-good .big { color: var(--green); } .lane-bad .big { color: var(--red); }
.cl-out p { margin: 6px 0 0; color: var(--mut); font-size: 12px; }
```

- [ ] **Step 2: Create src/modes/Compare.tsx**

```tsx
import { useMemo } from 'react';
import { RULES, useLab } from '../store';
import { scorePrompt } from '../analysis/scorer';
import { analyzeTokens } from '../analysis/tokenizer';
import { simulate } from '../sim/simulate';
import type { Scenario } from '../types';

function Lane({ kind, scenario }: { kind: 'good' | 'bad'; scenario: Scenario }) {
  const prompt = kind === 'good' ? scenario.goodPrompt : scenario.badPrompt;
  const { score, outcome, tokens } = useMemo(() => {
    const score = scorePrompt(prompt, RULES);
    const tokens = analyzeTokens(prompt);
    return { score, tokens, outcome: simulate(score, scenario, prompt, tokens.count) };
  }, [prompt, scenario]);
  const relevant = outcome.retrieval.filter((r) => r.relevant).length;
  return (
    <div className={`cmp-lane lane-${kind}`}>
      <div className="cl-prompt">
        <span className="tag">{kind.toUpperCase()} · {score.score}/100</span>
        {prompt.length > 220 ? `${prompt.slice(0, 220)}…` : prompt}
      </div>
      <div className="cl-flow">
        <div className="mini"><b>ANALYZE</b><span className="v">{score.elements.filter((e) => e.present).length}/7 elements</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>TOKENS</b><span className="v">{tokens.count}{kind === 'bad' ? ' · no signal' : ''}</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>RAG</b><span className="v">{relevant}/3 relevant</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>LLM</b><span className="v">risk: {outcome.hallucinationRisk}</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>MCP</b><span className="v">{outcome.tool.called ? (outcome.tool.correct ? 'right tool ✓' : 'wrong tool') : 'no tool call'}</span></div>
      </div>
      <div className="cl-out">
        <span className="big">{outcome.response.grade}</span>
        <p>{outcome.response.nextSteps[0]}</p>
      </div>
    </div>
  );
}

export function Compare() {
  const scenario = useLab((s) => s.scenario);
  return (
    <div>
      <p style={{ padding: '14px 20px 0', margin: 0, color: 'var(--mut)', fontSize: 14 }}>
        Same scenario, two prompts, racing through the same pipeline — <b style={{ color: 'var(--ink)' }}>{scenario.title}</b>.
      </p>
      <Lane kind="good" scenario={scenario} />
      <Lane kind="bad" scenario={scenario} />
    </div>
  );
}
```

- [ ] **Step 3: Route it in App.tsx** — replace the placeholder line for compare:

```tsx
import { Compare } from '../modes/Compare';
// in the JSX:
{mode === 'compare' && <Compare />}
```

- [ ] **Step 4: Verify**

Run: `npm run build` → success; dev-check: Compare tab shows both lanes, mini-stages lighting sequentially, A+ vs D− grades.

- [ ] **Step 5: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): compare mode with A/B lanes"
```

---

### Task 11: Learn mode — lesson runner, 8 lessons, practice challenges, Cheat Sheet

**Files:**
- Create: `content/lessons/01-press-enter.json` … `content/lessons/08-iteration.json` (8 files), `src/modes/Learn.tsx`, `src/modes/CheatSheet.tsx`, append styles to `src/app/app.css`
- Modify: `src/app/App.tsx` (route `learn` + `cheatsheet`)

**Interfaces:**
- Consumes: `loadLessons()`, `loadGlossary()`, `RULES.bestPractices` (Task 2), store, `scorePrompt` for challenges, `<PipelineCanvas />`.
- Produces: `<Learn />` (lesson list sidebar → step navigation driving the shared canvas: each step may set the composer prompt via `setPrompt(step.prompt, variant)` and spotlights one stage by setting `expandedStage`-independent highlight class), `<CheatSheet />` (best practices + glossary, print-friendly). Lesson completion stored in `localStorage` key `promptlab.lessons.done` (JSON string array of lesson ids).

- [ ] **Step 1: Create the 8 lesson JSON files** (complete content below — one file each; `scenarioId` is always `aircraft-manuals`)

`content/lessons/01-press-enter.json`:
```json
{
  "id": "press-enter", "order": 1, "title": "What happens when you press Enter", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "none", "heading": "Your prompt takes a journey", "body": "Between pressing Enter and seeing an answer, your words travel through six stations. Watch the whole trip once — then we'll stop at each station.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Present it as a table.", "variant": "good" },
    { "spotlight": "analyzer", "heading": "Station 1 — the Analyzer", "body": "First, the quality of your prompt is what it is — no system can add information you didn't provide. The Analyzer shows what your prompt contains: who the AI should be, what to do, the context, and the shape of the answer." },
    { "spotlight": "tokenizer", "heading": "Station 2 — the Tokenizer", "body": "Your sentence shatters into tokens — the ~¾-word pieces models actually read. Every token costs money, time, and space." },
    { "spotlight": "rag", "heading": "Station 3 — Retrieval (RAG)", "body": "The system searches your organisation's documents for chunks similar to your prompt and pastes the best matches alongside it. Specific words find the right documents." },
    { "spotlight": "llm", "heading": "Station 4 — the LLM", "body": "The model reads everything — system rules, retrieved chunks, your prompt — as one context window, then predicts the answer one token at a time." },
    { "spotlight": "mcp", "heading": "Station 5 — Tools (MCP)", "body": "If your task needs an action — searching an index, opening a ticket — the model picks a tool and fills in its arguments, using only what your prompt told it." },
    { "spotlight": "response", "heading": "Station 6 — the Response", "body": "The answer's quality was largely decided back at Station 1. That's the core idea of this whole lab: prompts are the steering wheel." }
  ],
  "challenge": { "brief": "Write any prompt for the aircraft-manuals scenario and run it through the pipeline. Just get a feel for the flow — any score is fine.", "requiredElements": ["task"] }
}
```

`content/lessons/02-anatomy.json`:
```json
{
  "id": "anatomy", "order": 2, "title": "Anatomy of a great prompt (PTCF)", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "composer", "heading": "Four load-bearing walls", "body": "Strong prompts are built from Persona, Task, Context, and Format. Watch the score climb as we add each one. We start with almost nothing:", "prompt": "help with an AI strategy", "variant": "bad" },
    { "spotlight": "analyzer", "heading": "P — Persona", "body": "'You are a Digital Project Manager at an aerospace company.' The model now answers with a PM's priorities and vocabulary instead of generic filler.", "prompt": "You are a Digital Project Manager at an aerospace company. Help with an AI strategy." },
    { "spotlight": "analyzer", "heading": "T — Task", "body": "One specific action verb and a named deliverable: 'Create a 3-month AI Implementation & Adoption Strategy.' Vague asks get vague answers.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy." },
    { "spotlight": "analyzer", "heading": "C — Context", "body": "The details that change the answer: what the tools are for, who uses them, and the constraints — speed, training, data-security compliance.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance." },
    { "spotlight": "analyzer", "heading": "F — Format", "body": "Say what the output should look like: 'Present it as a table with phases, owners, and milestones.' Never make the model guess the shape.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Present it as a table with phases, owners, and milestones." },
    { "spotlight": "response", "heading": "From 'poor' to 'good' in four moves", "body": "Same request, four additions — completely different outcome. Run it and compare against where we started." }
  ],
  "challenge": { "brief": "The Digital function wants to accelerate internal adoption of GenAI tools for engineers searching technical aircraft manuals. As Digital PM, draft a prompt for a 3-month AI Implementation & Adoption Strategy. Your prompt MUST include: Persona, Task, Context, Format.", "requiredElements": ["persona", "task", "context", "format"] }
}
```

`content/lessons/03-good-vs-bad.json`:
```json
{
  "id": "good-vs-bad", "order": 3, "title": "Good vs Bad, side by side", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "none", "heading": "The race", "body": "Two prompts, identical scenario. 'help me with AI rollout stuff for the docs thing, make it good' versus the full PTCF prompt. Open Compare mode after this lesson to watch them race.", "variant": "compare" },
    { "spotlight": "rag", "heading": "Where the bad prompt loses first", "body": "'stuff' and 'the docs thing' match nothing in the document index — retrieval returns noise, and the model gets no facts to work with.", "prompt": "help me with AI rollout stuff for the docs thing, make it good", "variant": "bad" },
    { "spotlight": "llm", "heading": "Garbage in, confident garbage out", "body": "With no persona, no deliverable, and junk retrieval, the model must guess everything. It will still answer fluently — that's what makes hallucination dangerous." },
    { "spotlight": "response", "heading": "D− vs A+", "body": "The bad prompt earns generic advice with invented details. The good prompt earns a structured, presentable strategy. The only difference was the prompt.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Present it as a table with phases, owners, and milestones.", "variant": "good" }
  ],
  "challenge": { "brief": "Take the bad prompt 'help me with AI rollout stuff for the docs thing, make it good' and fix it. Reach at least a 'good' score (65+) with Persona, Task, Context and Format present.", "requiredElements": ["persona", "task", "context", "format"] }
}
```

`content/lessons/04-leveling-up.json`:
```json
{
  "id": "leveling-up", "order": 4, "title": "Leveling up: Examples, Tone, Safeguards", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "analyzer", "heading": "Beyond PTCF", "body": "Your lesson-2 prompt scores well. Three additions push it to excellent — and they're exactly what separates workshop prompts from production prompts.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Present it as a table with phases, owners, and milestones.", "variant": "good" },
    { "spotlight": "analyzer", "heading": "Examples — show, don't describe", "body": "One sample row teaches the model your expectations better than a paragraph of description: 'For example: Month 1 — Pilot | Onboard 20 engineers | Digital PM | 80% activation'.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Present it as a table with phases, owners, and milestones. For example: 'Month 1 — Pilot | Onboard 20 engineers to the manual-search assistant | Digital PM | 80% pilot activation'." },
    { "spotlight": "analyzer", "heading": "Tone — name the voice", "body": "'Use a professional tone suitable for senior leadership.' Without it the model picks a voice at random — sometimes chatty, sometimes academic.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Use a professional tone suitable for senior leadership. Present it as a table with phases, owners, and milestones. For example: 'Month 1 — Pilot | Onboard 20 engineers to the manual-search assistant | Digital PM | 80% pilot activation'." },
    { "spotlight": "analyzer", "heading": "Safeguards — set the guardrails", "body": "'Do not include confidential program names; if you are unsure about a detail, say so rather than inventing it.' This is your anti-hallucination clause.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI Implementation & Adoption Strategy for rolling out Generative AI tools that help engineers search thousands of pages of technical aircraft manuals, balancing speed, training, and strict data-security compliance. Use a professional tone suitable for senior leadership. Present it as a table with phases, owners, and milestones. For example: 'Month 1 — Pilot | Onboard 20 engineers to the manual-search assistant | Digital PM | 80% pilot activation'. Do not include confidential program names; if you are unsure about a detail, say so rather than inventing it." },
    { "spotlight": "response", "heading": "Write like you talk", "body": "Notice the prompt reads like natural speech to a colleague — full sentences, your own words. That's the style that works. Run it: all seven elements, excellent band." }
  ],
  "challenge": { "brief": "Extend your lesson-2 prompt with Examples, Tone and Safeguards. Target: all 7 elements detected and an 'excellent' score (85+).", "requiredElements": ["persona", "task", "context", "format", "examples", "tone", "safeguards"] }
}
```

`content/lessons/05-token-economy.json`:
```json
{
  "id": "token-economy", "order": 5, "title": "The token economy", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "tokenizer", "heading": "Tokens are the currency", "body": "Every token costs three ways: money (per-token pricing), latency (models read sequentially), and context space (the window is finite). Here's a padded prompt:", "prompt": "Hello! I hope you are doing well. Could you please kindly help me — I would like you to create a summary of our AI rollout plan in order to be able to inform the team, it would be great if you could keep it basically very short. Thank you in advance." },
    { "spotlight": "tokenizer", "heading": "The optimizer's diff", "body": "Open the Tokenizer stage: 'could you please kindly' → gone; 'in order to be able to' → 'to'; the greeting and sign-off → gone. Same meaning, ~40% fewer tokens." },
    { "spotlight": "tokenizer", "heading": "Formatting is token strategy", "body": "Bullets beat prose for lists. Delimiters (``` or \\\"\\\"\\\") separate instructions from data. Front-load the task; don't repeat instructions. Politeness padding does nothing — models don't have feelings, they have budgets.", "prompt": "Summarize our AI rollout plan for the team in 5 bullets." },
    { "spotlight": "response", "heading": "Optimized ≠ stripped bare", "body": "Keep every token that adds information (persona, context, format). Cut every token that doesn't (greetings, hedges, filler). Score stays; cost drops." }
  ],
  "challenge": { "brief": "Write a prompt for the aircraft-manuals scenario that scores 'good' or better using at most 60 tokens. Watch the counter as you type.", "requiredElements": ["task", "context"] }
}
```

`content/lessons/06-rag.json`:
```json
{
  "id": "rag", "order": 6, "title": "How RAG reads your prompt", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "rag", "heading": "Search before answer", "body": "RAG turns your prompt into an embedding — a point in meaning-space — and finds document chunks nearby. Your prompt IS the search query, whether you meant it as one or not.", "prompt": "You are a Digital Project Manager. Create an adoption strategy for the Generative AI tools that help engineers search technical aircraft manuals, respecting our data-security compliance policy.", "variant": "good" },
    { "spotlight": "rag", "heading": "Keywords steer retrieval", "body": "'aircraft manuals', 'adoption strategy', 'data-security compliance' — each specific phrase pulls the matching document up the ranking. Watch the similarity bars." },
    { "spotlight": "rag", "heading": "Vague words retrieve noise", "body": "Now the same request, vaguely: watch relevant documents fall and the HR leave policy float up. The retriever isn't stupid — it was given nothing to grip.", "prompt": "help me with the rollout stuff for those docs", "variant": "bad" },
    { "spotlight": "llm", "heading": "Retrieval quality caps answer quality", "body": "The model can only cite what retrieval delivered. Junk chunks + vague prompt = the model improvises. This is why prompt specificity matters MORE in RAG systems, not less." }
  ],
  "challenge": { "brief": "Write a prompt whose retrieval finds at least 2 relevant documents (similarity ≥ 0.55). Use specific keywords from the scenario: manuals, engineers, rollout, security…", "requiredElements": ["task", "context"] }
}
```

`content/lessons/07-tools-mcp.json`:
```json
{
  "id": "tools-mcp", "order": 7, "title": "Prompts that act: Tools & MCP", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "mcp", "heading": "From words to actions", "body": "Modern assistants don't just write — they call tools: search indexes, ticket systems, email. MCP is the protocol that lists the tools; your prompt decides which get used and how.", "prompt": "You are a Digital Project Manager. Search our manual index for AI adoption strategy material and create a summary table of the top findings.", "variant": "good" },
    { "spotlight": "mcp", "heading": "Clear task → correct call", "body": "'Search our manual index for AI adoption strategy material' maps cleanly to search_manuals(query=\\\"AI adoption strategy aircraft manuals\\\") — right tool, right arguments, filled entirely from your words." },
    { "spotlight": "mcp", "heading": "Vague task → wrong call or none", "body": "'sort out the docs situation' — which tool is that? The model either guesses (create_ticket? send_email?) or does nothing. Ambiguity that a human colleague would clarify, a tool-calling model just… resolves badly.", "prompt": "sort out the docs situation", "variant": "bad" },
    { "spotlight": "response", "heading": "Agentic stakes are higher", "body": "A vague chat prompt wastes one answer. A vague agent prompt sends the wrong email. As AI takes actions, prompt precision stops being style and becomes safety." }
  ],
  "challenge": { "brief": "Write a prompt that would make the model call search_manuals with sensible arguments: name the action, the index, and what to do with the results.", "requiredElements": ["task", "context", "format"] }
}
```

`content/lessons/08-iteration.json`:
```json
{
  "id": "iteration", "order": 8, "title": "The iteration playbook", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "composer", "heading": "First drafts are drafts", "body": "Even excellent prompts rarely nail it first try — and that's fine. Professionals iterate. Four moves make up the playbook.", "variant": "good" },
    { "spotlight": "composer", "heading": "Move 1 — Nudge", "body": "Follow up conversationally: 'Make the second phase more detailed', 'Shorten the summary', 'Turn the risks into a table'. Small steering beats rewriting from scratch." },
    { "spotlight": "composer", "heading": "Move 2 — Chain", "body": "Break big jobs into a sequence: prompt 1 outlines the strategy → prompt 2 details Month 1 → prompt 3 drafts the training plan. Each prompt is small, checkable, and feeds the next. Close one task before starting another — don't change topics mid-thread.", "prompt": "First, list the 6 sections a 3-month AI adoption strategy should contain. Do not write the sections yet." },
    { "spotlight": "llm", "heading": "Move 3 — Trigger reasoning", "body": "'Let's think step-by-step' and 'show your reasoning' activate more careful generation patterns — cheap words, measurable gains on complex tasks.", "prompt": "Let's think step-by-step. You are a Digital Project Manager. Plan the security-review milestones for a GenAI rollout across 3 months." },
    { "spotlight": "composer", "heading": "Move 4 — Ask for feedback", "body": "End with: 'What questions do you have for me that would help you provide the best output?' The model surfaces your blind spots — missing context you didn't know you were withholding.", "prompt": "You are a Digital Project Manager at an aerospace company. Create a 3-month AI adoption strategy for engineers searching aircraft manuals. Present it as a table. What questions do you have for me that would help you provide the best output?" },
    { "spotlight": "response", "heading": "You've completed the course", "body": "PTCF + Examples/Tone/Safeguards + token economy + retrieval-aware wording + tool-clear tasks + iteration. Head to the Sandbox and make it yours — or the Cheat Sheet for the printable rules." }
  ],
  "challenge": { "brief": "Write a prompt that uses at least two playbook moves: a step-by-step trigger AND an ask-for-feedback close, on any aircraft-manuals task.", "requiredElements": ["task"] }
}
```

- [ ] **Step 2: Run content tests** — the Task 2 test already validates lessons.

Run: `npx vitest run tests/content.test.ts`
Expected: PASS — all 8 lessons parse and reference `aircraft-manuals`.

- [ ] **Step 3: Append Learn/CheatSheet styles to src/app/app.css**

```css
.learn { display: grid; grid-template-columns: 290px 1fr; min-height: 560px; }
.lessons { border-right: 1px solid var(--line2); padding: 14px; background: var(--panel2); }
.lesson { display: flex; gap: 10px; align-items: center; border-radius: 9px; padding: 8px 10px; font-size: 12.5px;
  color: var(--mut); width: 100%; text-align: left; }
.lesson .num { font-family: var(--mono); font-size: 10px; color: var(--dim); width: 18px; flex: none; }
.lesson.done .num { color: var(--green); }
.lesson.on { background: rgba(83,214,240,.08); box-shadow: inset 0 0 0 1px rgba(83,214,240,.35); color: var(--ink); }
.lesson.on .num { color: var(--cyan); }
.learn-canvas { position: relative; }
.learn-canvas .spot-dim .stage-card { opacity: .35; }
.learn-canvas .spot-dim .stage-card.spotlit { opacity: 1; box-shadow: 0 0 0 1px var(--amber), 0 0 30px -4px var(--amber); }
.narr { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); width: min(540px, 88%);
  background: var(--panel); border: 1px solid var(--line); border-radius: 13px; padding: 16px 18px;
  box-shadow: 0 22px 50px -18px rgba(0,0,0,.8); z-index: 10; }
.narr .step-eyebrow { font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; color: var(--amber); text-transform: uppercase; }
.narr h4 { margin: 6px 0; font-size: 15.5px; color: var(--ink); }
.narr p { margin: 0; color: var(--mut); font-size: 13px; }
.narr .nav { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-family: var(--mono); font-size: 11.5px; }
.narr .nav button { border: 1px solid var(--line); border-radius: 7px; padding: 5px 14px; color: var(--mut); }
.narr .nav button.next { background: rgba(83,214,240,.12); border-color: rgba(83,214,240,.5); color: var(--cyan); font-weight: 700; }
.narr .dots { margin-left: auto; display: flex; gap: 5px; }
.narr .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--line); }
.narr .dots i.on { background: var(--cyan); }
.challenge { border: 1px solid rgba(242,185,79,.4); background: rgba(242,185,79,.06); border-radius: 12px; padding: 14px 16px; margin: 14px; }
.challenge h4 { margin: 0 0 6px; color: var(--amber); font-family: var(--mono); font-size: 12px; letter-spacing: .1em; }
.challenge p { margin: 0 0 10px; font-size: 13px; color: var(--mut); }
.challenge textarea { width: 100%; min-height: 90px; }
.challenge .result { margin-top: 8px; font-family: var(--mono); font-size: 12px; }
.cheatsheet { max-width: 860px; margin: 0 auto; padding: 28px 20px 60px; }
.cheatsheet h2 { font-size: 18px; margin: 26px 0 10px; }
.bp { border: 1px solid var(--line2); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
.bp h3 { margin: 0 0 4px; font-size: 14px; color: var(--ink); }
.bp p { margin: 0; font-size: 13px; color: var(--mut); }
.bp .src { float: right; font-family: var(--mono); font-size: 9.5px; color: var(--dim); letter-spacing: .1em; }
@media print { .topbar, .transport { display: none; } body { background: #fff; color: #000; } .bp { break-inside: avoid; } }
```

- [ ] **Step 4: Create src/modes/Learn.tsx**

```tsx
import { useMemo, useState } from 'react';
import { loadLessons } from '../content/load';
import { RULES, useLab } from '../store';
import { scorePrompt } from '../analysis/scorer';
import { PipelineCanvas } from '../pipeline/Canvas';
import type { Lesson } from '../types';

const DONE_KEY = 'promptlab.lessons.done';
const readDone = (): string[] => { try { return JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]'); } catch { return []; } };

function Challenge({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [draft, setDraft] = useState('');
  const result = useMemo(() => (draft.trim() ? scorePrompt(draft, RULES) : null), [draft]);
  const missing = result ? lesson.challenge.requiredElements.filter(
    (el) => !result.elements.find((e) => e.element === el)!.present) : lesson.challenge.requiredElements;
  const passed = result !== null && missing.length === 0;
  return (
    <div className="challenge">
      <h4>PRACTICE CHALLENGE</h4>
      <p>{lesson.challenge.brief}</p>
      <textarea className="promptbox" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft your prompt here…" />
      {result && (
        <p className="result" style={{ color: passed ? 'var(--green)' : 'var(--amber)' }}>
          Score {result.score}/100 · {passed ? '✓ all required elements present — challenge complete!' : `still missing: ${missing.join(', ')}`}
        </p>
      )}
      {passed && <button className="runbtn" style={{ marginTop: 8 }} onClick={onDone}>✓ Mark lesson complete</button>}
    </div>
  );
}

export function Learn() {
  const lessons = useMemo(loadLessons, []);
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(readDone);
  const setPrompt = useLab((s) => s.setPrompt);
  const lesson = lessons.find((l) => l.id === activeId)!;
  const step = lesson.steps[stepIdx];
  const atEnd = stepIdx === lesson.steps.length - 1;

  const goTo = (l: Lesson, idx: number) => {
    setActiveId(l.id); setStepIdx(idx);
    const s = l.steps[idx];
    if (s.prompt) setPrompt(s.prompt, s.variant === 'bad' ? 'bad' : s.variant === 'good' ? 'good' : 'custom');
  };
  const markDone = () => {
    const next = [...new Set([...done, lesson.id])];
    setDone(next); localStorage.setItem(DONE_KEY, JSON.stringify(next));
  };

  return (
    <div className="learn">
      <aside className="lessons">
        <div className="lbl" style={{ margin: '4px 6px 10px' }}>Lessons</div>
        {lessons.map((l) => (
          <button key={l.id} className={`lesson ${l.id === activeId ? 'on' : ''} ${done.includes(l.id) ? 'done' : ''}`} onClick={() => goTo(l, 0)}>
            <span className="num">{done.includes(l.id) ? '✓' : String(l.order).padStart(2, '0')}</span>{l.title}
          </button>
        ))}
      </aside>
      <div className="learn-canvas">
        <div className={step.spotlight !== 'none' && step.spotlight !== 'composer' ? 'spot-dim' : ''} data-spotlight={step.spotlight}>
          <PipelineCanvas />
        </div>
        <div className="narr" role="region" aria-label="Lesson narration">
          <span className="step-eyebrow">Lesson {lesson.order} · step {stepIdx + 1} of {lesson.steps.length}</span>
          <h4>{step.heading}</h4>
          <p>{step.body}</p>
          <div className="nav">
            <button disabled={stepIdx === 0} onClick={() => goTo(lesson, stepIdx - 1)}>← Back</button>
            {!atEnd && <button className="next" onClick={() => goTo(lesson, stepIdx + 1)}>Next →</button>}
            <span className="dots">{lesson.steps.map((_s, i) => (<i key={i} className={i <= stepIdx ? 'on' : ''} />))}</span>
          </div>
        </div>
        {atEnd && <Challenge lesson={lesson} onDone={markDone} />}
      </div>
    </div>
  );
}
```

Spotlight wiring: in `src/pipeline/Canvas.tsx`, add to each stage-card's className: `` ${document ? '' : ''} `` — no. Instead modify `PipelineCanvas` to accept an optional prop: `export function PipelineCanvas({ spotlight }: { spotlight?: string })` and add `spotlit` class when `def.id === spotlight`; `Learn.tsx` then renders `<PipelineCanvas spotlight={step.spotlight} />` directly (drop the `data-spotlight` wrapper div, keep the `spot-dim` wrapper class logic as shown). Sandbox renders it without the prop — no behavior change.

- [ ] **Step 5: Create src/modes/CheatSheet.tsx**

```tsx
import { useMemo } from 'react';
import { loadGlossary } from '../content/load';
import { RULES } from '../store';

export function CheatSheet() {
  const glossary = useMemo(loadGlossary, []);
  return (
    <div className="cheatsheet">
      <h1 style={{ fontSize: 24 }}>Prompt Engineering Cheat Sheet</h1>
      <p style={{ color: 'var(--mut)' }}>The rules PromptLab scores against. Print me (Ctrl/Cmd+P) and pin me next to your keyboard.</p>
      <h2>Best practices</h2>
      {RULES.bestPractices.map((b) => (
        <div key={b.id} className="bp">
          <span className="src">{b.source === 'user' ? 'CORE' : 'STANDARD'}</span>
          <h3>{b.title}</h3><p>{b.detail}</p>
        </div>
      ))}
      <h2>Glossary</h2>
      {glossary.map((g) => (
        <div key={g.term} className="bp"><h3>{g.term}</h3><p>{g.definition}</p></div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Route both in App.tsx** — replace the remaining placeholder:

```tsx
import { Learn } from '../modes/Learn';
import { CheatSheet } from '../modes/CheatSheet';
// in the JSX:
{mode === 'learn' && <Learn />}
{mode === 'cheatsheet' && <CheatSheet />}
```

- [ ] **Step 7: Verify**

Run: `npm test` (all pass, lessons validated) then `npm run build` then dev-check: Learn tab → lesson 2 → stepping changes the composer prompt and spotlights stages; final step shows the challenge; passing it persists ✓ across reload; Cheat Sheet renders and prints cleanly.

- [ ] **Step 8: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): learn mode with 8 lessons, practice challenges, cheat sheet"
```

---

### Task 12: BYO API key — provider adapters + settings modal + live response

**Files:**
- Create: `src/llm/providers.ts`, `src/components/SettingsModal.tsx`
- Modify: `src/pipeline/stages/ResponseStage.tsx` (live-response section in Expanded), `src/app/App.tsx` (settings state → TopBar `onSettings`)

**Interfaces:**
- Consumes: store; `TopBar`'s existing `onSettings` prop (Task 9).
- Produces: `providers.ts` exports `type ProviderId = 'gemini' | 'openai' | 'anthropic'`, `PROVIDERS: { id: ProviderId; label: string }[]`, `getKeyConfig(): { provider: ProviderId; key: string } | null`, `saveKeyConfig(provider: ProviderId, key: string): void`, `clearKeyConfig(): void` (localStorage key `promptlab.byok`), and `complete(provider: ProviderId, key: string, prompt: string): Promise<string>` (throws `Error` with a human-readable message on failure).

- [ ] **Step 1: Create src/llm/providers.ts**

```ts
export type ProviderId = 'gemini' | 'openai' | 'anthropic';
export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' },
];

const STORAGE_KEY = 'promptlab.byok';

export function getKeyConfig(): { provider: ProviderId; key: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveKeyConfig(provider: ProviderId, key: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, key }));
}
export function clearKeyConfig(): void { localStorage.removeItem(STORAGE_KEY); }

async function readError(res: Response): Promise<never> {
  const detail = await res.text().catch(() => '');
  if (res.status === 401 || res.status === 403) throw new Error('The API key was rejected — check it in Settings.');
  if (res.status === 429) throw new Error('Rate limit or quota exceeded — try again in a minute.');
  throw new Error(`Provider error ${res.status}: ${detail.slice(0, 200)}`);
}

export async function complete(provider: ProviderId, key: string, prompt: string): Promise<string> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) await readError(res);
    return (await res.json()).choices[0].message.content;
  }
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'x-api-key': key,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) await readError(res);
    return (await res.json()).content[0].text;
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
  );
  if (!res.ok) await readError(res);
  return (await res.json()).candidates[0].content.parts[0].text;
}
```

- [ ] **Step 2: Create src/components/SettingsModal.tsx**

```tsx
import { useState, type CSSProperties } from 'react';
import { PROVIDERS, type ProviderId, getKeyConfig, saveKeyConfig, clearKeyConfig } from '../llm/providers';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const existing = getKeyConfig();
  const [provider, setProvider] = useState<ProviderId>(existing?.provider ?? 'gemini');
  const [key, setKey] = useState(existing?.key ?? '');
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head" style={{ '--stage-color': 'var(--cyan)' } as CSSProperties}>
          ⚙ SETTINGS — BRING YOUR OWN API KEY
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="expanded-body">
          <p>Optional, advanced: with your own API key, the <b>Response stage in Sandbox</b> shows a real model answer for your custom prompts. Everything upstream (analysis, tokens, retrieval) stays simulated and free.</p>
          <p style={{ color: 'var(--amber)' }}>🔒 Your key is stored only in this browser's localStorage and sent only directly to the provider you choose. It never touches any other server. Clear it any time.</p>
          <label className="lbl">Provider</label>
          <select className="promptbox" style={{ minHeight: 0 }} value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
          </select>
          <label className="lbl" htmlFor="byok-key">API key</label>
          <input id="byok-key" className="promptbox" style={{ minHeight: 0 }} type="password" value={key}
            onChange={(e) => setKey(e.target.value)} placeholder="paste key — stays in this browser" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="runbtn" style={{ flex: 1 }} onClick={() => { saveKeyConfig(provider, key.trim()); onClose(); }} disabled={key.trim() === ''}>Save</button>
            <button className="tbtn" style={{ width: 'auto', padding: '0 14px' }} onClick={() => { clearKeyConfig(); setKey(''); }}>Clear key</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add live response to ResponseStage Expanded.** In `src/pipeline/stages/ResponseStage.tsx`, extend `Expanded`:

```tsx
import { useState } from 'react';
import { useLab } from '../../store';
import { Gauge } from '../../components/Gauge';
import { complete, getKeyConfig } from '../../llm/providers';

// Card unchanged from Task 8.

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { response } = useLab((s) => s.outcome);
  const { promptText, variant, mode } = useLab((s) => ({ promptText: s.promptText, variant: s.variant, mode: s.mode }));
  const [live, setLive] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; text: string }>({ status: 'idle', text: '' });
  const cfg = getKeyConfig();
  const canGoLive = cfg !== null && mode === 'sandbox' && variant === 'custom';

  const askLive = async () => {
    setLive({ status: 'loading', text: '' });
    try {
      setLive({ status: 'ok', text: await complete(cfg!.provider, cfg!.key, promptText) });
    } catch (err) {
      setLive({ status: 'error', text: err instanceof Error ? err.message : 'Request failed.' });
    }
  };

  return (
    <div className="expanded-body">
      <h4>Simulated response ({response.grade})</h4>
      <pre className="response-text">{response.text}</pre>
      <h4>Next steps (iterate — don't expect perfection first try)</h4>
      {response.nextSteps.map((n, i) => (<p key={i} className="tip-line">↺ {n}</p>))}
      {canGoLive && (
        <>
          <h4>Live response — via your {cfg!.provider} key</h4>
          {live.status === 'idle' && <button className="runbtn" onClick={askLive}>⚡ Ask the real model</button>}
          {live.status === 'loading' && <p>Contacting {cfg!.provider}…</p>}
          {live.status === 'ok' && <pre className="response-text">{live.text}</pre>}
          {live.status === 'error' && <p className="flag-line">⚠ {live.text}</p>}
        </>
      )}
      {cfg === null && mode === 'sandbox' && variant === 'custom' && (
        <p className="tip-line">💡 Add your own API key in Settings (⚙) to see a real model answer this prompt.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire settings into App.tsx**

```tsx
import { useState } from 'react';
import { SettingsModal } from '../components/SettingsModal';
// inside App():
const [settingsOpen, setSettingsOpen] = useState(false);
// JSX: <TopBar onSettings={() => setSettingsOpen(true)} />
//      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
```

- [ ] **Step 5: Verify**

Run: `npm run build` → success. Dev-check: ⚙ opens settings; saving a fake key then opening Response expanded on a custom prompt shows "Ask the real model"; clicking surfaces the rejected-key error inline without breaking the pipeline.

- [ ] **Step 6: Commit**

```bash
git add Prompt_Engineering
git commit -m "feat(promptlab): BYO API key with gemini/openai/anthropic adapters and settings modal"
```

---

### Task 13: Accessibility pass, README, CONTRIBUTING, final verification

**Files:**
- Create: `README.md`, `CONTRIBUTING.md`
- Modify: `src/app/tokens.css` (reduced-motion + focus), `index.html` (meta description)

**Interfaces:**
- Consumes: everything.
- Produces: the shippable repo.

- [ ] **Step 1: Accessibility sweep**

Append to `src/app/tokens.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
```
Add to `index.html` `<head>`: `<meta name="description" content="PromptLab — an interactive visualization that teaches prompt engineering by animating your prompt through RAG, LLM, and MCP tool stages." />`.
Manual keyboard check in dev: Tab reaches tabs → composer → run → every stage card → transport; Esc closes overlays.

- [ ] **Step 2: Write README.md** — must contain, in this order: title + one-line pitch; "why" paragraph (prompts drive RAG/LLM/tool outcomes); features list (Sandbox, Learn ×8, Compare, Cheat Sheet, token optimizer, BYO key); quick start (`npm install && npm run dev`); **deploy section**: push this folder as a new GitHub repo → Settings → Pages → Source: "GitHub Actions" → the included workflow deploys on push to main; architecture diagram (the file-structure block from this plan's header); "extending PromptLab" pointer to CONTRIBUTING.md; roadmap (from spec §10 **plus**: dedicated Web Worker for the tokenizer — v1 runs it debounced on the main thread); MIT license note.

- [ ] **Step 3: Write CONTRIBUTING.md** — four copy-paste recipes, each with a worked example:
  1. **Add a lesson**: copy `content/lessons/08-iteration.json`, change `id/order/title/steps/challenge`, run `npm test` (schema-validated automatically), done — no code.
  2. **Add a scenario**: copy `content/scenarios/aircraft-manuals.json`, keep ≥3 documents / ≥2 tools / all 4 band responses; first tool = the correct one.
  3. **Add a scoring rule**: add pattern to `content/rules/scoring-rules.json` elements/flags/bonuses; element weights must sum to 100 (test enforces).
  4. **Add a pipeline stage**: create `src/pipeline/stages/YourStage.tsx` exporting `Card`/`Expanded`, register in `src/pipeline/registry.ts`, update slot CSS if >6 stages.
  Plus: dev setup, test commands, PR checklist (typecheck, test, build all green).

- [ ] **Step 4: Full verification**

Run: `npm run typecheck && npm test && npm run build`
Expected: zero TS errors; all suites pass; build succeeds. Then `npm run preview` and click through all four modes once.

- [ ] **Step 5: Final commit**

```bash
git add Prompt_Engineering
git commit -m "docs(promptlab): README, CONTRIBUTING, accessibility polish"
```

---

## Plan Self-Review Notes (already applied)

- Spec §3 named a Web Worker for the tokenizer; v1 runs `gpt-tokenizer` debounced on the main thread (<5ms per keystroke) — recorded as an explicit deviation in Task 4 and surfaced in the README roadmap (Task 13).
- Spec canvas zoom/pan is satisfied at v1 scope by the fixed serpentine layout fitting one viewport; full zoom/pan joins the roadmap.
- Glossary hover-tooltips reduced to a Cheat Sheet glossary section (Task 11) — same content, simpler v1 surface.
- Type/name consistency verified across tasks: `useLab`, `RULES`, `SCENARIOS`, `scorePrompt`, `analyzeTokens`, `optimizePrompt`, `simulate`, `advance`, `stageIndexAt`, `RUN_DURATION_MS`, `stageRegistry`, `PipelineCanvas(spotlight?)`, `getKeyConfig/saveKeyConfig/clearKeyConfig/complete`.





