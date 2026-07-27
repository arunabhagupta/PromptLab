# Learn-Focus Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Narrow PromptLab to Learn + Cheat Sheet modes and rewrite Lesson 1 so it teaches prompting prerequisites and the scoring system before Lesson 2 introduces PTCF.

**Architecture:** Two independent changes. (1) A new `src/app/modes.ts` exports a single `ENABLED_MODES` constant consumed by `TopBar.tsx` (tab filtering), `useHashMode.ts` (route guarding), and `store.ts` (initial mode) — the one place to edit when re-enabling Sandbox/Compare. (2) Content-only rewrites of three JSON lesson files under `content/`, validated by the existing `tests/content.test.ts` zod schema suite. No engine code (scorer, simulator, tokenizer, pipeline canvas) is touched.

**Tech Stack:** React 18 + TypeScript, Zustand store, zod content schemas, Vitest.

## Global Constraints

- Sandbox and Compare code must remain intact and untouched — this is a reversible "hide", not a deletion. Only `ENABLED_MODES` gates them.
- Lesson JSON must satisfy `lessonSchema` in `src/content/schemas.ts`: `spotlight` is one of `analyzer|tokenizer|rag|llm|mcp|response|composer|none`; `steps` needs `.min(2)`; `requiredElements` must be a non-empty subset of `persona|task|context|format|examples|tone|safeguards`.
- Lesson 1 keeps `"id": "press-enter"` and `"order": 1` — only title/steps/challenge content changes. `scenarioId` stays `"support-kb"`.
- Score bands, quoted verbatim from `src/analysis/scorer.ts:5-10`: excellent ≥ 85, good ≥ 65, fair ≥ 45, poor < 45.
- Element weights, quoted verbatim from `content/rules/scoring-rules.json`: persona 15, task 25, context 20, format 15, examples 10, tone 7, safeguards 8 (sum 100).
- Run `npm run typecheck && npm test` before every commit. All 41 existing tests must stay green.

---

### Task 1: Gate navigation to Learn + Cheat Sheet

**Files:**
- Create: `src/app/modes.ts`
- Create: `tests/modes.test.ts`
- Modify: `src/components/TopBar.tsx:3-8` (TABS filtering), `src/app/useHashMode.ts:4-19` (route guard), `src/store.ts:46` (initial mode)

**Interfaces:**
- Produces: `ENABLED_MODES: readonly ('learn' | 'cheatsheet')[]` and `isEnabledMode(value: string): value is EnabledMode` from `src/app/modes.ts`. Task 2 does not consume these.

- [ ] **Step 1: Write the failing test**

Create `tests/modes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ENABLED_MODES, isEnabledMode } from '../src/app/modes';

describe('ENABLED_MODES', () => {
  it('exposes only learn and cheatsheet', () => {
    expect([...ENABLED_MODES]).toEqual(['learn', 'cheatsheet']);
  });
  it('isEnabledMode accepts enabled modes', () => {
    expect(isEnabledMode('learn')).toBe(true);
    expect(isEnabledMode('cheatsheet')).toBe(true);
  });
  it('isEnabledMode rejects disabled and unknown modes', () => {
    expect(isEnabledMode('sandbox')).toBe(false);
    expect(isEnabledMode('compare')).toBe(false);
    expect(isEnabledMode('nonsense')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modes.test.ts`
Expected: FAIL — cannot resolve `../src/app/modes`.

- [ ] **Step 3: Create the constant module**

Create `src/app/modes.ts`:

```ts
export const ENABLED_MODES = ['learn', 'cheatsheet'] as const;
export type EnabledMode = (typeof ENABLED_MODES)[number];

export function isEnabledMode(value: string): value is EnabledMode {
  return (ENABLED_MODES as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Filter the nav tabs**

In `src/components/TopBar.tsx`, add the import and filter `TABS` at render. Replace the `<nav>` block's `.map` source so disabled tabs never render:

```tsx
import { useLab } from '../store';
import { isEnabledMode } from '../app/modes';

const TABS = [
  { mode: 'learn', label: '📖 Learn' },
  { mode: 'sandbox', label: '🧪 Sandbox' },
  { mode: 'compare', label: '⇅ Compare' },
  { mode: 'cheatsheet', label: '📋 Cheat Sheet' },
] as const;

const VISIBLE_TABS = TABS.filter((t) => isEnabledMode(t.mode));
```

Then change the map inside `<nav className="tabs" aria-label="Mode">` from `TABS.map(...)` to `VISIBLE_TABS.map(...)`. Leave the rest of the component unchanged.

- [ ] **Step 6: Guard the hash router**

In `src/app/useHashMode.ts`, replace the module-level `MODES`/`Mode` declarations and the `fromHash` body so a disabled hash falls back to `learn`:

```ts
import { useEffect } from 'react';
import { useLab } from '../store';
import { isEnabledMode } from './modes';

export function useHashMode(): void {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.replace('#/', '');
      const next = isEnabledMode(h) ? h : 'learn';
      if (next !== useLab.getState().mode) setMode(next);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [setMode]);
  useEffect(() => { location.hash = `#/${mode}`; }, [mode]);
}
```

Note: the existing second `useEffect` already rewrites `location.hash` from `mode`, so a bookmarked `#/sandbox` is corrected to `#/learn` automatically once `setMode('learn')` runs.

- [ ] **Step 7: Change the store's initial mode**

In `src/store.ts`, on the line reading `mode: 'sandbox', theme: 'dark',` (inside the `create<LabState>` initializer, around line 46), change `'sandbox'` to `'learn'`:

```ts
  mode: 'learn', theme: 'dark',
```

Leave the `Mode` type union (line 13) unchanged — Sandbox/Compare remain valid states, just unreachable via nav.

- [ ] **Step 8: Verify the whole suite passes**

Run: `npm run typecheck && npm test`
Expected: PASS — 8 test files, 44 tests (41 existing + 3 new).

- [ ] **Step 9: Commit**

```bash
git add src/app/modes.ts src/components/TopBar.tsx src/app/useHashMode.ts src/store.ts tests/modes.test.ts
git commit -m "feat(nav): gate app to Learn and Cheat Sheet modes"
```

---

### Task 2: Rewrite Lesson 1 and fix mode-dependent lesson copy

**Files:**
- Modify: `content/lessons/01-press-enter.json` (full rewrite of `title`, `steps`, `challenge`)
- Modify: `content/lessons/03-good-vs-bad.json:4` (drop the Compare-mode pointer)
- Modify: `content/lessons/08-iteration.json:9` (drop the Sandbox pointer)
- Test: `tests/content.test.ts` (existing, unchanged — it already validates every lesson file against `lessonSchema`)

**Interfaces:**
- Consumes: nothing from Task 1. These two tasks are independent.
- Produces: no code interfaces — content only.

- [ ] **Step 1: Confirm the content suite currently passes**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS (5 tests). This is the guard rail for the rewrite — it validates schema conformance and that `scenarioId` resolves.

- [ ] **Step 2: Rewrite Lesson 1**

Replace the entire contents of `content/lessons/01-press-enter.json`:

```json
{
  "id": "press-enter", "order": 1, "title": "Prompting fundamentals: how scoring works", "scenarioId": "support-kb",
  "steps": [
    { "spotlight": "none", "heading": "A prompt is not magic — it's data", "body": "Everything the model gives back is built from what you put in. No stage downstream can add a fact, a constraint, or a preference you never wrote. That makes your wording the single biggest lever on the result — so this lab starts by teaching you to measure it.", "prompt": "You are a Program Manager at a retail company. Create a 3-month AI Adoption Plan for rolling out a Generative AI search assistant that helps support agents search thousands of pages of product manuals, balancing speed, training, and strict data-privacy compliance. Present it as a table.", "variant": "good" },
    { "spotlight": "analyzer", "heading": "Meet the scorer — seven elements", "body": "PromptLab grades every prompt against seven elements, each worth a fixed weight: Persona 15, Task 25, Context 20, Format 15, Examples 10, Tone 7, Safeguards 8. They total 100. The ✓/✗ badges on this card show which ones your prompt currently contains — that's your raw score before adjustments." },
    { "spotlight": "analyzer", "heading": "Reading your band", "body": "Your total lands in one of four bands: poor (0–44), fair (45–64), good (65–84), excellent (85–100). Two things move the number afterwards — flags subtract (vague words, slang, contradictions) and bonuses add (a step-by-step trigger, asking for feedback). Click this Analyzer card to expand it: you'll get a full table of every element, its weight, whether it was found, and the exact text that matched." },
    { "spotlight": "tokenizer", "heading": "Station — the Tokenizer", "body": "Your sentence is split into tokens, the ~¾-word pieces models actually read. Every token costs money, latency, and context space. Lesson 5 goes deep on trimming them without losing score." },
    { "spotlight": "rag", "heading": "Station — Retrieval (RAG)", "body": "The system searches your organisation's documents for chunks similar to your prompt and pastes the best matches alongside it. Specific nouns find the right documents; vague ones retrieve noise. Lesson 6 covers this in detail." },
    { "spotlight": "llm", "heading": "Station — the LLM", "body": "The model reads everything at once — hidden system rules, the retrieved chunks, and your prompt — as a single context window, then predicts its answer one token at a time." },
    { "spotlight": "mcp", "heading": "Station — Tools (MCP)", "body": "When a task needs an action rather than prose — searching an index, opening a ticket — the model picks a tool and fills its arguments using only what your prompt told it. Vague wording produces the wrong call, or none. Lesson 7 covers this." },
    { "spotlight": "response", "heading": "The response reflects your prompt", "body": "Relevance, completeness, and safety all trace back to what you wrote at the start. You now know how the score is built — next lesson you'll construct a prompt element by element and watch the number climb." }
  ],
  "challenge": { "brief": "Write any prompt for the support-kb scenario, then click the Analyzer card to expand it. Read your band, check which of the seven elements came back ✗, and see whether you picked up any flags. Getting a low score here is fine — the point is learning to read the breakdown.", "requiredElements": ["task"] }
}
```

- [ ] **Step 3: Remove the Compare-mode pointer from Lesson 3**

In `content/lessons/03-good-vs-bad.json`, in the first step (the one with `"heading": "The race"`), the `body` currently ends with a sentence pointing at the now-hidden Compare mode. Change that `body` value to:

```
"Two prompts, identical scenario. 'help me with AI rollout stuff for the docs thing, make it good' versus the full PTCF prompt. Watch what changes at each stage as we step through them."
```

Leave the step's `spotlight` and `variant` fields as they are.

- [ ] **Step 4: Remove the Sandbox pointer from Lesson 8**

In `content/lessons/08-iteration.json`, in the final step (the one with `"heading": "You've completed the course"`), change that step's `body` value to:

```
"PTCF + Examples/Tone/Safeguards + token economy + retrieval-aware wording + tool-clear tasks + iteration. Open the Cheat Sheet for the printable rules — and revisit any lesson from the list on the left."
```

- [ ] **Step 5: Verify content schema validation passes**

Run: `npx vitest run tests/content.test.ts`
Expected: PASS (5 tests). If `lessonSchema` rejects anything, the JSON is malformed or a `spotlight`/`requiredElements` value is outside its enum — fix the JSON, never the schema.

- [ ] **Step 6: Verify the whole suite passes**

Run: `npm run typecheck && npm test`
Expected: PASS — all tests green.

- [ ] **Step 7: Commit**

```bash
git add content/lessons/01-press-enter.json content/lessons/03-good-vs-bad.json content/lessons/08-iteration.json
git commit -m "feat(content): teach scoring fundamentals in lesson 1"
```

---

### Task 3: Manual verification in the browser

**Files:** none modified — this task is verification only.

**Interfaces:**
- Consumes: the shipped behavior of Tasks 1 and 2.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Note the printed local URL (Vite defaults to `http://localhost:5173`).

- [ ] **Step 2: Verify the navigation gate**

In the browser:
- The top bar shows exactly two tabs: **📖 Learn** and **📋 Cheat Sheet**. No Sandbox, no Compare.
- Loading the bare URL lands on Learn (not Sandbox).
- Manually navigating to `#/sandbox` redirects to Learn and the address bar rewrites itself to `#/learn`. Same for `#/compare`.
- The Cheat Sheet tab still opens and renders.

- [ ] **Step 3: Verify Lesson 1 end to end**

- Lesson 1 in the left list reads "Prompting fundamentals: how scoring works".
- Step through all 8 narration steps with Next; the spotlight moves and the eyebrow reads "step N of 8".
- On step 3, click the Analyzer card — the expanded view opens showing the element/weight/found table.
- On the last step, the practice challenge appears below the canvas. Type a prompt into it and confirm the score line updates live and the pipeline cards react as you type.
- Click a different lesson in the left sidebar, then click back to Lesson 1 — it should return you to the step you left off on, with the challenge reachable.

- [ ] **Step 4: Stop the dev server**

Press Ctrl+C in the terminal running Vite.

- [ ] **Step 5: Commit any fixes**

If Steps 2–3 surfaced defects, fix them, re-run `npm run typecheck && npm test`, and commit. If everything passed, there is nothing to commit — this task produces no diff of its own.

---

## Notes for the implementer

- **Why `VISIBLE_TABS` is computed at module scope** in Task 1 Step 5: `ENABLED_MODES` is a compile-time constant, so the filter never needs to re-run per render.
- **Do not delete** `src/modes/Sandbox.tsx`, `src/modes/Compare.tsx`, `src/modes/Composer.tsx`, `src/modes/Transport.tsx`, or their branches in `src/app/App.tsx`. They stay wired so that re-enabling is a one-line change to `ENABLED_MODES`.
- **Do not widen or narrow the `Mode` union** in `src/store.ts:13`. `setMode('sandbox')` remains type-valid; it's simply unreachable through the UI.
- The numbers quoted in Lesson 1's new copy (weights, band thresholds) are duplicated from `content/rules/scoring-rules.json` and `src/analysis/scorer.ts`. If those ever change, this lesson text must be updated to match — it is prose, not a computed binding.
