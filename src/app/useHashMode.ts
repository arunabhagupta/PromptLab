import { useEffect } from 'react';
import { useLab } from '../store';
import { isEnabledMode } from './modes';

export function useHashMode(): void {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.replace('#/', '');
      if (!isEnabledMode(h)) {
        // rewrite before comparing: a disabled hash must not survive in the address bar
        // even when the store already sits on the fallback mode
        location.hash = '#/learn';
        if (useLab.getState().mode !== 'learn') setMode('learn');
        return;
      }
      if (h !== useLab.getState().mode) setMode(h);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [setMode]);
  useEffect(() => { location.hash = `#/${mode}`; }, [mode]);
}
