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
