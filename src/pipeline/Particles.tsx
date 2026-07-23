import { useLab } from '../store';

export function Particles() {
  const playing = useLab((s) => s.playback.status === 'playing');
  if (!playing) return null;
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={`particle ${i % 3 === 2 ? 'alt' : ''}`} style={{ animationDelay: `${i * 0.6}s` }} aria-hidden />
      ))}
    </>
  );
}
