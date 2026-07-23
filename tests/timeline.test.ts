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
  it('setScenario switches scenario and rederives outcome', () => {
    const s = useLab.getState();
    const current = s.scenario.id;
    s.setScenario('nonexistent-id');            // unknown id → no change
    expect(useLab.getState().scenario.id).toBe(current);
  });
});
