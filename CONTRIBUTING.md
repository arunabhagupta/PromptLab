# Contributing to PromptLab

PromptLab is deliberately content-driven: lessons, scenarios, and scoring rules are all plain JSON under `content/`, validated by zod schemas in `src/content/schemas.ts` and checked automatically by `tests/content.test.ts`. Most contributions need **no code changes** — just a new or edited JSON file plus a test run.

## Dev setup

```bash
npm install
npm run dev        # local dev server with HMR
```

## Test commands

```bash
npm run typecheck  # tsc --noEmit
npm test           # vitest run (includes content schema validation)
npm run test:watch # vitest in watch mode
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build locally
```

## Recipes

### 1. Add a lesson

Lessons live in `content/lessons/*.json` and are picked up automatically via a Vite glob import (`src/content/load.ts`) — no registration step, no code touch.

1. Copy an existing lesson as a starting point:
   ```bash
   cp content/lessons/08-iteration.json content/lessons/09-my-lesson.json
   ```
2. Edit the new file:
   - `id` — a unique slug (e.g. `"my-lesson"`)
   - `order` — the next integer (e.g. `9`); Learn mode sorts by this
   - `title` — shown in the lesson list
   - `scenarioId` — must match an existing (or new) scenario's `id`
   - `steps` — at least 2 steps, each with a `spotlight` (a stage id, `"composer"`, or `"none"`), `heading`, `body`, and optionally a `prompt` to preload into the composer and a `variant` (`"good"`/`"bad"`/`"compare"`)
   - `challenge` — a `brief` and `requiredElements` (at least one of `persona`, `task`, `context`, `format`, `examples`, `tone`, `safeguards`)
3. Run `npm test` — `tests/content.test.ts` validates the file against `lessonSchema` and confirms `scenarioId` points to a real scenario.
4. Done. The lesson appears in Learn mode automatically.

**Worked example** — a minimal valid lesson body:

```json
{
  "id": "my-lesson", "order": 9, "title": "My new lesson", "scenarioId": "aircraft-manuals",
  "steps": [
    { "spotlight": "composer", "heading": "Step one", "body": "Explain the idea here." },
    { "spotlight": "llm", "heading": "Step two", "body": "Point at a stage and explain what changes.", "prompt": "You are a ... Create a ...", "variant": "good" }
  ],
  "challenge": { "brief": "Write a prompt that does X.", "requiredElements": ["task"] }
}
```

### 2. Add a scenario

Scenarios live in `content/scenarios/*.json`, also auto-loaded via glob. They must satisfy `scenarioSchema`:

- `documents`: **at least 3** entries (`id`, `title`, `keywords`)
- `tools`: **at least 2** entries (`name`, `goodArgs`, `description`) — **the first tool in the array is treated as the correct one** for the simulation engine to call on a good prompt
- `responses`: all **4 bands** required — `excellent`, `good`, `fair`, `poor`

1. Copy the featured scenario as a template:
   ```bash
   cp content/scenarios/aircraft-manuals.json content/scenarios/my-scenario.json
   ```
2. Edit `id`, `title`, `description`, `goodPrompt` (≥50 chars), `badPrompt`, `documents` (≥3), `tools` (≥2, correct tool first), and `responses` (all 4 bands, ideally written to visibly escalate in quality/specificity).
3. Run `npm test` to validate against the schema.
4. Reference the new scenario's `id` from a lesson's `scenarioId` — that's how Learn mode picks it up: each lesson step drives `useLab`'s `scenario` via `setScenario`. Sandbox and Compare don't yet expose a scenario picker; they always run against the first scenario (alphabetical by filename). A scenario picker UI for Sandbox/Compare is on the roadmap.

**Worked example** — trimmed shape:

```json
{
  "id": "my-scenario", "title": "...", "description": "...",
  "goodPrompt": "You are a ... Create a ... for ..., balancing ... Present it as ...",
  "badPrompt": "help me with the thing",
  "documents": [
    { "id": "doc1.pdf", "title": "...", "keywords": ["..."] },
    { "id": "doc2.md", "title": "...", "keywords": ["..."] },
    { "id": "doc3.pdf", "title": "...", "keywords": ["..."] }
  ],
  "tools": [
    { "name": "search_docs", "goodArgs": "query=\"...\"", "description": "the correct tool — must be first" },
    { "name": "send_email", "goodArgs": "", "description": "a plausible but wrong tool" }
  ],
  "responses": { "excellent": "...", "good": "...", "fair": "...", "poor": "..." }
}
```

### 3. Add a scoring rule

Scoring rules live in the single file `content/rules/scoring-rules.json`, validated by `scoringRulesSchema`.

- To detect a new signal inside an existing **element** (persona/task/context/format/examples/tone/safeguards), add a regex string to that element's `patterns` array.
- To add a new **flag** (a penalty for a bad habit), append an object with `id`, `label`, `advice`, `penalty` (positive int), and `patterns` to the `flags` array.
- To add a new **bonus** (extra points for a good habit), append an object with `id`, `label`, `points` (positive int), and `patterns` to the `bonuses` array.
- **Element weights must sum to exactly 100** — `tests/content.test.ts` enforces this. If you change a weight, rebalance another element to compensate.
- Every pattern is compiled as a case-insensitive `RegExp` — `tests/content.test.ts` also checks every pattern string actually compiles, so test invalid regex locally before committing.

**Worked example** — adding a bonus for citing sources:

```json
{ "id": "cites-sources", "label": "Asks for citations", "points": 4, "patterns": ["cite (your )?sources", "include references"] }
```

Append that object to the `bonuses` array in `content/rules/scoring-rules.json`, then run `npm test`.

### 4. Add a pipeline stage

Stages are React components registered in `src/pipeline/registry.ts`. Each stage file exports two named components, `Card` (compact, shown in the pipeline canvas) and `Expanded` (shown in the click-through overlay), both typed as `ComponentType<{ revealed: boolean }>`.

1. Create `src/pipeline/stages/YourStage.tsx`:
   ```tsx
   import type { StageProps } from '../registry';

   export function Card({ revealed }: StageProps) {
     return <div>{revealed ? 'Compact summary…' : '···'}</div>;
   }
   export function Expanded({ revealed }: StageProps) {
     return <div>Full detail view…</div>;
   }
   ```
2. Register it in `src/pipeline/registry.ts`:
   ```ts
   import * as YourStage from './stages/YourStage';
   // add to stageRegistry:
   { id: 'yourStage', title: 'YOUR STAGE', colorVar: 'var(--violet)', order: 6, ...YourStage },
   ```
   Note `id` must extend the `StageId` union in `src/types.ts` if it's a genuinely new stage (not just re-theming an existing one).
3. If the pipeline now has more than 6 stages, update the slot CSS in `src/pipeline/pipeline.css` (the `.slot-N` grid-position rules) so the new card has a place in the serpentine layout.
4. Run `npm run typecheck && npm test` — the registry and `StageId` type must agree, and existing tests should be unaffected unless they reference `stageRegistry` length directly.

## PR checklist

Before opening a PR, confirm all three pass locally (this is exactly what CI runs):

```bash
npm run typecheck
npm test
npm run build
```

- [ ] `npm run typecheck` — zero TS errors
- [ ] `npm test` — all suites green, including content schema validation
- [ ] `npm run build` — production build succeeds
- [ ] New/changed JSON content validates against its zod schema (covered by `npm test`)
- [ ] If you added a scenario: ≥3 documents, ≥2 tools with the correct one first, all 4 response bands present
- [ ] If you changed scoring weights: element weights still sum to 100
