import { useLab } from '../../store';

const RISK_COLOR = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)' } as const;

export function Card({ revealed }: { revealed: boolean }) {
  const { contextWindow: cw, hallucinationRisk: risk } = useLab((s) => s.outcome);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <span style={{ fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--dim)' }}>context window</span>
      <div className="ctx">
        <i style={{ width: `${cw.systemPct}%`, background: '#3A4C86' }} />
        <i style={{ width: `${cw.ragPct}%`, background: '#B98A38' }} />
        <i style={{ width: `${cw.promptPct}%`, background: '#2E93BE' }} />
      </div>
      <div className="stat"><span style={{ color: '#7C8FC7' }}>■ system</span><span style={{ color: 'var(--amber)' }}>■ RAG</span><span style={{ color: 'var(--cyan)' }}>■ prompt</span></div>
      <div className="stat"><span>halluc. risk</span><b style={{ color: RISK_COLOR[risk] }}>{risk}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { contextWindow: cw, hallucinationRisk: risk } = useLab((s) => s.outcome);
  return (
    <div className="expanded-body">
      <p>Everything the model sees is one stacked context window: the app's system prompt ({cw.systemPct}%), retrieved chunks ({cw.ragPct}%), and your prompt ({cw.promptPct}%). The model attends over all of it and predicts one token at a time.</p>
      <p>When the prompt is vague and retrieval is noisy, the model still <em>must</em> answer — it fills gaps from statistical patterns. That's a hallucination: current risk <b style={{ color: RISK_COLOR[risk] }}>{risk}</b>.</p>
      <p>💡 Front-load role and task — early tokens anchor the model's plan for the whole answer. Trigger phrases like "let's think step-by-step" activate stronger reasoning patterns.</p>
    </div>
  );
}
