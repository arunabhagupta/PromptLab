# Learn-mode focus revamp — Design Spec

**Date:** 2026-07-27
**Status:** Approved by user, pending implementation.

## 1. Purpose

PromptLab currently ships four modes (Learn, Sandbox, Compare, Cheat Sheet). The user wants to narrow focus, for now, to teaching prompting technique well: Learn mode becomes the only interactive mode (plus the passive Cheat Sheet reference), and Lesson 1 — currently a pure pipeline-mechanics tour — gets rewritten to actually teach prompting prerequisites and the scoring system, which today is never explained anywhere in the app.

This is a content and navigation change only. No engine code (scorer, simulator, tokenizer, pipeline canvas) changes.

## 2. Problem with the current state

- **Lesson 1** ("What happens when you press Enter") is a six-station tour of pipeline mechanics. It mentions "quality score" once in passing and never explains the 0–100 scale, the four score bands, or that flags subtract / bonuses add. PTCF isn't introduced until Lesson 2, so a first-time user has no framework for writing a prompt before they're asked to.
- **The scoring system is only surfaced in the Analyzer stage's expanded view** (a click-to-expand table of element weights, flags, and bonuses) — nothing in Learn mode ever tells the learner that view exists or walks them through reading it.
- **Sandbox and Compare** are fully-built modes not part of the current focus; the user wants them out of the nav "for now" without losing the code.

## 3. Navigation change: disable Sandbox & Compare

Add a single source-of-truth constant:

```ts
// src/app/modes.ts (new file)
export const ENABLED_MODES = ['learn', 'cheatsheet'] as const;
```

- **`TopBar.tsx`**: filter the `TABS` array to only render tabs whose `mode` is in `ENABLED_MODES`.
- **`store.ts`**: change the initial `mode` from `'sandbox'` to `'learn'`.
- **`useHashMode.ts`**: when parsing `location.hash`, only honor values in `ENABLED_MODES`. If the hash points at a disabled mode (e.g. someone has `#/sandbox` bookmarked), fall back to `'learn'` and rewrite the hash accordingly, instead of rendering the disabled mode.
- `App.tsx`, `Sandbox.tsx`, `Compare.tsx`, and their store fields stay completely untouched — re-enabling later is a one-line edit to `ENABLED_MODES`.

**Dependent content fix (in scope, not scope creep — a direct consequence of disabling these modes):** two lesson lines currently point at the now-unreachable modes and need a small wording tweak so they don't dead-end:
- `content/lessons/03-good-vs-bad.json`, step 1 body: drop "Open Compare mode after this lesson to watch them race."
- `content/lessons/08-iteration.json`, final step body: drop "Head to the Sandbox and make it yours —" (keep the Cheat Sheet pointer).

## 4. Lesson 1 rewrite

File: `content/lessons/01-press-enter.json`. Same shell (8 narration steps + 1 practice challenge, same `id`/`order`), new title and content:

**Title:** "Prompting fundamentals: how scoring works" (was "What happens when you press Enter")

| # | Spotlight | Heading | Teaches |
|---|---|---|---|
| 1 | none | A prompt is not magic — it's data | Nothing is added that you didn't provide; prompt quality is the ceiling on answer quality. Runs the existing good example prompt through the pipeline once. |
| 2 | analyzer | Meet the scorer | The 7 weighted elements (Persona, Task, Context, Format, Examples, Tone, Safeguards), weights sum to 100. |
| 3 | analyzer | Reading your band | The 4 bands (poor 0–44 / fair 45–64 / good 65–84 / excellent 85–100); flags subtract, bonuses add; explicit instruction to click the Analyzer card to expand the full breakdown. |
| 4 | tokenizer | Station — the Tokenizer | Brief: tokens cost money/time/space (depth deferred to Lesson 5). |
| 5 | rag | Station — Retrieval (RAG) | Brief: retrieval finds document chunks by similarity (depth deferred to Lesson 6). |
| 6 | llm | Station — the LLM | Brief: model reads system + retrieved chunks + prompt as one context window. |
| 7 | mcp | Station — Tools (MCP) | Brief: tool calls are filled entirely from prompt wording (depth deferred to Lesson 7). |
| 8 | response | The response reflects your prompt | Ties back to the causal chain; hands off to Lesson 2's PTCF construction. |

**Challenge brief** changes from "any score is fine" to explicitly instructing the learner to expand the Analyzer card and read their band/flags before iterating. (The grading mechanism only checks structural element presence via `scorePrompt`, so `requiredElements` stays `["task"]` — the brief is a guided action, not something the grader can verify by itself.)

Lessons 2–8 content is otherwise untouched (per user's explicit scope: "just work on the first section").

## 5. Testing

- `tests/content.test.ts` already validates every lesson against the zod schema and checks `scenarioId` references — the rewritten Lesson 1 must keep passing it unchanged (no schema changes needed).
- No new test files needed; this is content + a small nav filter, not new logic. Manually verify in the dev server: nav shows only Learn/Cheat Sheet, `#/sandbox` and `#/compare` redirect to Learn, Lesson 1 renders and its challenge still grades correctly.

## 6. Out of scope (explicitly deferred)

- Rewriting lessons 2–8.
- Re-enabling Sandbox/Compare (this is a "for now" hide, reversible via `ENABLED_MODES`).
- Any change to the scorer/simulator engines — this is purely a content and navigation change.
