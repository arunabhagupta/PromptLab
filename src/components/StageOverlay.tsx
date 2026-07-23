import { useEffect, type CSSProperties } from 'react';
import { useLab } from '../store';
import { stageRegistry } from '../pipeline/registry';

export function StageOverlay() {
  const expanded = useLab((s) => s.expandedStage);
  const expandStage = useLab((s) => s.expandStage);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') expandStage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandStage]);
  if (!expanded) return null;
  const def = stageRegistry.find((d) => d.id === expanded)!;
  return (
    <div className="overlay" onClick={() => expandStage(null)} role="dialog" aria-modal="true" aria-label={def.title}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head" style={{ '--stage-color': def.colorVar } as CSSProperties}>
          <span className="swatch" />{def.title}
          <button className="x" onClick={() => expandStage(null)} aria-label="Close">✕</button>
        </div>
        <def.Expanded revealed />
      </div>
    </div>
  );
}
