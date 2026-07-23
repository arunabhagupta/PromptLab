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
