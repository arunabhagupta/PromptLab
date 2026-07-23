# PromptLab — Interactive Prompt Engineering Visualizer — Design Spec

**Date:** 2026-07-23
**Location:** `Prompt_Engineering/` (built standalone-repo-ready; later pushed as its own GitHub repo, suggested name `prompt-engineering-lab`)
**Approved mockup:** https://claude.ai/code/artifact/da843ab0-a0ff-41d3-9dc8-8ebd3e00fe0e

## 1. Purpose & Audience

A bbycroft.net/llm-inspired interactive visualization that teaches prompt engineering by showing how a prompt flows through a GenAI pipeline: **Prompt Analyzer → Tokenizer → RAG → LLM Core → Tools/MCP → Response**. Users see cause and effect: prompt quality drives retrieval relevance, hallucination risk, tool-call accuracy, and response quality.

Audience: newbies, students, senior developers, and non-technical staff. Hosted free on GitHub Pages; extensible by the community via JSON content files.

## 2. Approved Decisions

| Decision | Choice |
|---|---|
| Visual style | 2.5D animated SVG pipeline (not full 3D WebGL, not scrollytelling) |
| LLM behavior | Deterministic simulation + optional BYO API key (Gemini/OpenAI/Anthropic) for real responses in Sandbox |
| Learning structure | Guided Learn mode (JSON lessons) + free Sandbox mode, sharing one pipeline canvas |
| Repo/deploy | Self-contained project with own README, package.json, GitHub Actions → Pages workflow |
| Stack | React 18 + TypeScript + Vite; SVG canvas; custom rAF timeline engine; Zustand state; `gpt-tokenizer` in a web worker; Vitest |
| Theme | Dark instrument-panel default + light theme; `prefers-reduced-motion` fallback |

## 3. Architecture

**Principle: content is data, engine is code.** All learning material lives in `content/` as JSON validated against schemas in CI. Adding a lesson, scenario, or scoring rule requires no engine changes.

```
Prompt_Engineering/
├─ .github/workflows/deploy.yml     # typecheck + test + schema-validate + build → Pages
├─ README.md · CONTRIBUTING.md · LICENSE (MIT)
├─ package.json · vite.config.ts · tsconfig.json · index.html
├─ content/
│  ├─ lessons/*.json                # guided lessons (1 file = 1 lesson)
│  ├─ scenarios/*.json              # good/bad prompt pairs + expected pipeline outcomes
│  ├─ rules/scoring-rules.json      # prompt-quality heuristics (lexicons, penalties, bonuses)
│  ├─ glossary.json                 # hover-term definitions
│  └─ schema/                       # JSON Schemas + contributor docs
├─ src/
│  ├─ app/                          # shell, routing (hash-based for Pages), theming
│  ├─ engine/                       # timeline.ts (rAF play/pause/step/speed),
│  │                                # particles.ts (token particle system), layout.ts
│  ├─ pipeline/
│  │  ├─ stages/<stage-name>/       # one folder per stage: card view + expanded view
│  │  └─ registry.ts               # pluggable stage registry
│  ├─ analysis/
│  │  ├─ scorer.ts                  # rule-based scoring from scoring-rules.json
│  │  ├─ tokenizer.ts               # gpt-tokenizer wrapper in web worker
│  │  └─ optimizer.ts               # token-saving suggestions + before/after diff
│  ├─ llm/                          # BYO-key provider adapters: gemini, openai, anthropic
│  ├─ modes/                        # Learn mode, Sandbox mode, Compare mode, Cheat Sheet
│  └─ components/                   # inspector, narration bubble, transport bar, etc.
└─ tests/                           # Vitest unit + content-schema validation
```

**Extensibility contract:**
- New pipeline stage = one folder under `pipeline/stages/` + one line in `registry.ts`.
- New lesson/scenario = one JSON file; CI schema validation rejects malformed content.
- Scoring behavior tunable by editing `scoring-rules.json` only.

## 4. Pipeline Stages (each: compact card + click-to-expand deep-dive)

1. **Prompt Analyzer** — detects Persona / Task / Context / Format (+ Examples / Tone / Safeguards); ✓/✗ badges; 0–100 score; flags vagueness, slang, conflicting instructions, bias terms.
2. **Tokenizer** — real BPE tokenization (`gpt-tokenizer`, web worker); colored token chips; live count + cost estimate.
3. **RAG Retrieval** — simulated vector search over a mini document set (includes the aerospace aircraft-manuals scenario). Similarity scores derive from prompt score + keyword overlap. Expanded view: embedding → vector search → top-k.
4. **LLM Core** — context-window assembly bar (system + RAG chunks + prompt); simplified attention/reasoning animation; hallucination-risk meter driven by prompt score.
5. **Tools / MCP** — tool discovery and invocation; clear task → correct tool + parameters; vague task → wrong/no tool call.
6. **Response & Quality** — outcome with relevance/completeness/safety gauges + "next step" iteration tips.

**Compare mode:** split-screen A/B — good and bad prompt animate through parallel pipelines simultaneously. The signature teaching moment.

**Canvas interactions:** zoom/pan, click-to-expand stages, transport bar (play / pause / step / speed), Good↔Bad prompt toggle, Compare button.

## 5. Deterministic Engines

**Scorer** (`analysis/scorer.ts` + `content/rules/scoring-rules.json`):
- Detectors per element (keyword lexicons + regex heuristics).
- Penalties: vagueness, slang/informal language, conflicting instructions, bias terms, illegible writing.
- Bonuses: example demonstrations, "step-by-step" reasoning triggers, ask-for-feedback closes.
- Output: per-element ✓/✗, 0–100 score, human-readable feedback strings.
- **Score bands drive the simulation:** retrieval similarity, hallucination-risk meter, tool-call accuracy, and response grades all derive deterministically from the score, so identical input always produces identical output.

**Token Optimizer** (`analysis/optimizer.ts`):
- Detects filler phrases, politeness padding, redundant instructions.
- Before/after diff with token delta.
- Formatting guidance: bullets vs prose, delimiters, front-loading instructions, context placement.

## 6. Content Plan

### v1 Lessons (8 JSON files)
1. **What happens when you press Enter** — guided pipeline tour.
2. **Anatomy of a great prompt** — PTCF; user assembles a prompt piece-by-piece.
3. **Good vs Bad, side by side** — aircraft-manuals scenario as featured A/B run (mirrors training challenge 1).
4. **Leveling up: Examples, Tone, Safeguards** — extends lesson 3 (mirrors training challenge 2).
5. **The token economy** — tokens = cost + latency + context budget; live optimizer demo.
6. **How RAG reads your prompt** — retrieval deep-dive.
7. **Prompts that act: Tools & MCP** — tool-call deep-dive.
8. **The iteration playbook** — chaining, iterative nudging, reasoning triggers, ask-for-feedback close.

Each lesson: narration steps that spotlight stages (player-piano over the shared canvas) + a closing **practice challenge** (scenario → user drafts prompt → Analyzer scores against required elements).

### Best-practices knowledge base (`content/rules/` → Analyzer feedback + Cheat Sheet page)
User-supplied rules: concise & clear; contextually relevant; task-aligned; example demonstrations; free from bias; be specific with keywords; write legibly (punctuation/grammar); ask for feedback; break up complex workflows (chaining); iterative fine-tuning; prompt triggers ("let's think step-by-step"); avoid vagueness/slang/informal language; avoid conflicting instructions/abrupt topic changes.
Standard additions: delimiters for structure; explicit output-format specification; positive instruction framing ("do X" over "don't Y"); front-load key instructions; context placement.
Cheat Sheet page: searchable, printable.

## 7. BYO API Key (Sandbox-only)

- Settings modal → provider (Gemini / OpenAI / Anthropic) → key stored in `localStorage` only, with explicit "your key never leaves your browser except direct to the provider" notice.
- When enabled, the Response stage shows real model output for custom prompts (all three providers support browser CORS). Everything upstream stays simulated.
- Errors (bad key, quota, network) render inside the Response stage without breaking animation.

## 8. Quality, CI, Deployment

- **Vitest:** scorer (every rule + score band), optimizer, tokenizer wrapper, timeline math; content-schema validation of every `content/` file.
- **GitHub Actions:** PRs → typecheck + tests + schema validation + build; push to main → same + deploy to Pages.
- **Accessibility:** semantic HTML, keyboard navigation across stages, `prefers-reduced-motion` → instant state transitions instead of particles.
- **Docs:** README (what/why/screenshots/quick-start); CONTRIBUTING.md with recipes: add a lesson, add a scenario, add a scoring rule, add a pipeline stage.

## 9. Visual Design (per approved mockup)

- Dark instrument-panel default: ground `#0A0F1E`, panels `#111931`, ink `#E7EDFB`; flow-cyan `#53D6F0`, good-green `#43DE9B`, bad-red `#F26D85`, warn-amber `#F2B94F`; hue-coded stages (violet analyzer, cyan tokenizer, amber RAG, blue LLM, magenta MCP, green response). Light theme ships alongside.
- Type: system-ui for narrative; monospace for instrument labels/data.
- Layout: top bar (logo, Learn/Sandbox/Cheat Sheet tabs, key status, settings) · left composer panel (prompt input with color-highlighted elements, PTCF checklist, optimizer tip, Run button) · pipeline canvas (serpentine two-row layout) · bottom transport bar.

## 10. Out of Scope for v1 (README roadmap)

User accounts / cross-device progress (localStorage only), multi-language, mobile-optimized layout (responsive-usable only), Playwright E2E, gamification/badges, full 3D WebGL mode.
