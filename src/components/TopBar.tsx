import { useLab } from '../store';

const TABS = [
  { mode: 'learn', label: '📖 Learn' },
  { mode: 'sandbox', label: '🧪 Sandbox' },
  { mode: 'compare', label: '⇅ Compare' },
  { mode: 'cheatsheet', label: '📋 Cheat Sheet' },
] as const;

export function TopBar({ onSettings }: { onSettings?: () => void }) {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  const theme = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);
  return (
    <header className="topbar">
      <span className="logo">⚡ Prompt<b>Lab</b></span>
      <nav className="tabs" aria-label="Mode">
        {TABS.map((t) => (
          <button key={t.mode} className={`tab ${mode === t.mode ? 'on' : ''}`} onClick={() => setMode(t.mode)}>{t.label}</button>
        ))}
      </nav>
      <span className="right">
        <span className="author">Arunabha Gupta</span>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '🌙'}</button>
        {onSettings && <button onClick={onSettings} aria-label="Settings">⚙</button>}
      </span>
    </header>
  );
}
