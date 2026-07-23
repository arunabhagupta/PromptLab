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
  setScenario: (id: string) => void;
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
  setScenario: (id) => {
    const scenario = SCENARIOS.find((s) => s.id === id);
    if (!scenario || scenario.id === get().scenario.id) return;
    const text = get().promptText;
    set({ scenario, ...derive(text, scenario), playback: { ...get().playback, status: 'idle', progress: 0 } });
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
