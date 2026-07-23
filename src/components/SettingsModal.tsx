import { useEffect, useState, type CSSProperties } from 'react';
import { PROVIDERS, type ProviderId, getKeyConfig, saveKeyConfig, clearKeyConfig } from '../llm/providers';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const existing = getKeyConfig();
  const [provider, setProvider] = useState<ProviderId>(existing?.provider ?? 'gemini');
  const [key, setKey] = useState(existing?.key ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head" style={{ '--stage-color': 'var(--cyan)' } as CSSProperties}>
          ⚙ SETTINGS — BRING YOUR OWN API KEY
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="expanded-body">
          <p>Optional, advanced: with your own API key, the <b>Response stage in Sandbox</b> shows a real model answer for your custom prompts. Everything upstream (analysis, tokens, retrieval) stays simulated and free.</p>
          <p style={{ color: 'var(--amber)' }}>🔒 Your key is stored only in this browser's localStorage and sent only directly to the provider you choose. It never touches any other server. Clear it any time.</p>
          <label className="lbl">Provider</label>
          <select className="promptbox" style={{ minHeight: 0 }} value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
          </select>
          <label className="lbl" htmlFor="byok-key">API key</label>
          <input id="byok-key" className="promptbox" style={{ minHeight: 0 }} type="password" value={key}
            onChange={(e) => setKey(e.target.value)} placeholder="paste key — stays in this browser" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="runbtn" style={{ flex: 1 }} onClick={() => { saveKeyConfig(provider, key.trim()); onClose(); }} disabled={key.trim() === ''}>Save</button>
            <button className="tbtn" style={{ width: 'auto', padding: '0 14px' }} onClick={() => { clearKeyConfig(); setKey(''); }}>Clear key</button>
          </div>
        </div>
      </div>
    </div>
  );
}
