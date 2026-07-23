import { useState } from 'react';
import { useLab } from '../store';
import { useTimeline } from '../engine/timeline';
import { useHashMode } from './useHashMode';
import { TopBar } from '../components/TopBar';
import { StageOverlay } from '../components/StageOverlay';
import { SettingsModal } from '../components/SettingsModal';
import { Sandbox } from '../modes/Sandbox';
import { Compare } from '../modes/Compare';
import { Learn } from '../modes/Learn';
import { CheatSheet } from '../modes/CheatSheet';

export default function App() {
  useTimeline();
  useHashMode();
  const mode = useLab((s) => s.mode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div>
      <TopBar onSettings={() => setSettingsOpen(true)} />
      {mode === 'sandbox' && <Sandbox />}
      {mode === 'compare' && <Compare />}
      {mode === 'learn' && <Learn />}
      {mode === 'cheatsheet' && <CheatSheet />}
      <StageOverlay />
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
