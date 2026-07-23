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
