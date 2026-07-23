# PromptLab

An interactive visualization that teaches prompt engineering by animating your prompt through RAG, LLM, and MCP tool stages.

Created and maintained by **Arunabha Gupta**.

## Why

The quality of a prompt is not a matter of taste — it's the single biggest lever on what a retrieval-augmented, tool-using LLM system actually does. A vague prompt makes retrieval pull the wrong documents, the model guess at intent, and tools get called with bad arguments or not at all. A well-formed prompt (a clear persona, task, context, and format) drives better retrieval, a better-reasoned answer, and correct tool use — deterministically enough that you can *see* it happen. PromptLab exists to make that causal chain visible: type a prompt, press run, and watch it flow stage by stage from analysis through to the final response, with the score, token cost, and outcome changing live as you edit.

## Features

- **Sandbox** — free-form prompt composer with a live six-stage pipeline (Analyzer → Tokenizer → RAG → LLM → Tools/MCP → Response), a good/bad prompt toggle, and adjustable playback speed.
- **Learn** — 8 guided lessons (prompt anatomy, good vs. bad, leveling up, token economy, RAG, tools/MCP, iteration playbook, and more) with spotlighted stages and a practice challenge at the end of each.
- **Compare** — side-by-side A/B view of two prompts against the same scenario, showing score, tokens, and outcome differences at a glance.
- **Cheat Sheet** — printable reference: best-practice list, scoring rubric, and glossary.
- **Deterministic prompt scorer & token optimizer** — a rules-driven engine (no LLM call needed) that scores your prompt against 7 elements (persona, task, context, format, examples, tone, safeguards), flags issues, awards bonuses, and suggests token-saving rewrites.
- **BYO API key** — optionally paste a Gemini, OpenAI, or Anthropic API key in Settings to run your actual prompt against a real model and see the live response alongside the simulated one. Keys are stored only in `localStorage`, never sent anywhere but the provider you chose.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed local URL. No API key is required to use any mode — the BYO-key integration in Settings is entirely optional.

## Deploy

1. In the GitHub repo, go to **Settings → Pages → Source** and select **"GitHub Actions"**.
2. The included workflow (`.github/workflows/deploy.yml`) runs typecheck + tests + build and deploys `dist/` on every push to `main`.

No other configuration is needed — the workflow already has the `pages`/`id-token` permissions it needs.

## Architecture

```
PromptLab/
├─ .github/workflows/deploy.yml        # Pages CI — deploys on every push to main
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

Everything content-shaped (lessons, scenarios, scoring rules, glossary) lives as JSON under `content/` and is validated against zod schemas in `src/content/schemas.ts` by `tests/content.test.ts` — bad content fails CI, not the browser.

## Extending PromptLab

Adding a lesson, scenario, scoring rule, or pipeline stage requires no changes to the app shell. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for copy-paste recipes with worked examples.

## Roadmap

Not in v1, tracked as future work:

- User accounts / cross-device progress sync
- Multi-language content
- Mobile-optimized layout
- Playwright end-to-end tests
- Gamification / badges
- Full 3D WebGL pipeline mode
- Dedicated Web Worker for the tokenizer — v1 runs `gpt-tokenizer` synchronously on the main thread (well under budget at typical prompt lengths, but a worker would remove any risk of jank on very long input)
- Canvas zoom/pan — v1 fits the fixed six-stage serpentine layout into one viewport
- Compare mode currently uses a summarized mini-flow per lane rather than two fully animated pipeline canvases (full dual-canvas animation is planned)

## Prompt-writing tips (embodied in Learn mode)

The Learn mode's 8 lessons and the scoring engine encode a specific set of prompt-writing practices — worth knowing before you dive in:

- **PTCF** — Persona, Task, Context, Format are the four load-bearing elements of a strong prompt; add Examples, Tone, and Safeguards on top for the full 7-element rubric PromptLab scores against.
- **Token economy** — every word costs money, latency, and context space; trim filler ("please kindly", "in order to") without losing meaning.
- **Prompt chaining** — break a big job into a sequence of small, checkable prompts, each feeding the next.
- **Iterative fine-tuning** — don't expect a perfect result on the first try; nudge with short follow-ups instead of rewriting from scratch.
- **Step-by-step triggers** — phrases like "let's think step-by-step" measurably improve reasoning on complex tasks.
- **Ask for feedback** — closing a prompt with "what questions do you have for me?" surfaces blind spots you didn't know you had.

Open **Learn** in the app to walk through all of this against a real scenario.

## License

Copyright (c) 2026 Arunabha Gupta. All rights reserved.

PromptLab is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE): you may use, modify, and share it for **noncommercial purposes only**. Any commercial use requires prior written permission from the author — contact arunabhagupta@gmail.com.
