import type { CSSProperties } from 'react';
import { useLab } from '../store';
import { stageIndexAt } from '../engine/timeline';
import { stageRegistry } from './registry';
import { Particles } from './Particles';

export function PipelineCanvas({ spotlight }: { spotlight?: string } = {}) {
  const { status, progress } = useLab((s) => s.playback);
  const expandStage = useLab((s) => s.expandStage);
  const activeIdx = status === 'playing' ? stageIndexAt(progress) : -1;
  const revealedThrough = status === 'done' ? 6 : progress * 6 - 0.5;

  return (
    <div className="canvas">
      <svg className="wires" viewBox="0 0 900 560" preserveAspectRatio="none" aria-hidden>
        <path className="wire" d="M 290 155 H 320" /><path className="wire" d="M 580 155 H 610" />
        <path className="wire" d="M 750 250 V 310" />
        <path className="wire" d="M 610 425 H 580" /><path className="wire" d="M 320 425 H 290" />
      </svg>
      <Particles />
      <div className="stage-grid">
        {stageRegistry.map((def) => {
          const revealed = def.order < revealedThrough || status === 'done' || status === 'idle';
          return (
            <button
              key={def.id}
              className={`stage-card slot-${def.order} ${revealed ? 'revealed' : ''} ${activeIdx === def.order ? 'active' : ''} ${def.id === spotlight ? 'spotlit' : ''}`}
              style={{ '--stage-color': def.colorVar } as CSSProperties}
              onClick={() => expandStage(def.id)}
              aria-label={`Open ${def.title} details`}
            >
              <span className="stage-head"><span className="swatch" />{def.title}<span className="n">stage {def.order + 1}/6</span></span>
              <def.Card revealed={revealed} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
