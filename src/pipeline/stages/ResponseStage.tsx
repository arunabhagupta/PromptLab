import { useEffect, useState } from 'react';
import { useLab } from '../../store';
import { Gauge } from '../../components/Gauge';
import { complete, getKeyConfig } from '../../llm/providers';

export function Card({ revealed }: { revealed: boolean }) {
  const { response } = useLab((s) => s.outcome);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <div className="gauges">
        <Gauge label="relevance" value={response.relevance} color="var(--green)" />
        <Gauge label="complete" value={response.completeness} color="var(--green)" />
        <Gauge label="safety" value={response.safety} color="var(--cyan)" />
      </div>
      <div className="stat"><span>grade</span><b>{response.grade}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { response } = useLab((s) => s.outcome);
  const promptText = useLab((s) => s.promptText);
  const variant = useLab((s) => s.variant);
  const mode = useLab((s) => s.mode);
  const [live, setLive] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; text: string }>({ status: 'idle', text: '' });
  const cfg = getKeyConfig();
  const canGoLive = cfg !== null && mode === 'sandbox' && variant === 'custom';

  useEffect(() => { setLive({ status: 'idle', text: '' }); }, [promptText]);

  const askLive = async () => {
    setLive({ status: 'loading', text: '' });
    try {
      setLive({ status: 'ok', text: await complete(cfg!.provider, cfg!.key, promptText) });
    } catch (err) {
      setLive({ status: 'error', text: err instanceof Error ? err.message : 'Request failed.' });
    }
  };

  return (
    <div className="expanded-body">
      <h4>Simulated response ({response.grade})</h4>
      <pre className="response-text">{response.text}</pre>
      <h4>Next steps (iterate — don't expect perfection first try)</h4>
      {response.nextSteps.map((n, i) => (<p key={i} className="tip-line">↺ {n}</p>))}
      {canGoLive && (
        <>
          <h4>Live response — via your {cfg!.provider} key</h4>
          {live.status === 'idle' && <button className="runbtn" onClick={askLive}>⚡ Ask the real model</button>}
          {live.status === 'loading' && <p>Contacting {cfg!.provider}…</p>}
          {live.status === 'ok' && <pre className="response-text">{live.text}</pre>}
          {live.status === 'error' && <p className="flag-line">⚠ {live.text}</p>}
        </>
      )}
      {cfg === null && mode === 'sandbox' && variant === 'custom' && (
        <p className="tip-line">💡 Add your own API key in Settings (⚙) to see a real model answer this prompt.</p>
      )}
    </div>
  );
}
