import { useLab } from '../store';

export function Transport() {
  const status = useLab((s) => s.playback.status);
  const speed = useLab((s) => s.playback.speed);
  const variant = useLab((s) => s.variant);
  const run = useLab((s) => s.run);
  const pause = useLab((s) => s.pause);
  const resetRun = useLab((s) => s.resetRun);
  const setSpeed = useLab((s) => s.setSpeed);
  const setVariant = useLab((s) => s.setVariant);
  const setMode = useLab((s) => s.setMode);
  return (
    <footer className="transport">
      <button className="tbtn play" onClick={status === 'playing' ? pause : run} aria-label={status === 'playing' ? 'Pause' : 'Play'}>
        {status === 'playing' ? '⏸' : '▶'}
      </button>
      <button className="tbtn" onClick={resetRun} aria-label="Reset">⏮</button>
      <label>speed
        <input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /> {speed}×
      </label>
      <div className="gvb" role="group" aria-label="Prompt variant">
        <button className={variant === 'good' ? 'sel-good' : ''} onClick={() => setVariant('good')}>GOOD PROMPT</button>
        <button className={variant === 'bad' ? 'sel-bad' : ''} onClick={() => setVariant('bad')}>BAD PROMPT</button>
      </div>
      <button className="tbtn" style={{ width: 'auto', padding: '0 12px' }} onClick={() => setMode('compare')}>⇅ Compare A/B</button>
    </footer>
  );
}
