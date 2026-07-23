import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const tokens = useLab((s) => s.tokens);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      <div className="tokens-strip">{tokens.tokens.slice(0, 14).map((t, i) => (<span key={i} className="tk">{t}</span>))}{tokens.count > 14 && <span className="tk">…</span>}</div>
      <div className="stat"><span>tokens</span><b>{tokens.count}</b></div>
      <div className="stat"><span>est. cost</span><b>${tokens.costUsd.toFixed(6)}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const tokens = useLab((s) => s.tokens);
  const optimizer = useLab((s) => s.optimizer);
  return (
    <div className="expanded-body">
      <p>Models read tokens, not words (~¾ of a word each). You pay per token — in money, latency, and context-window space. Estimated at a typical small model's input rate.</p>
      <div className="tokens-strip expanded">{tokens.tokens.map((t, i) => (<span key={i} className="tk">{t}</span>))}</div>
      <h4>Optimizer — save {optimizer.originalTokens - optimizer.optimizedTokens} tokens</h4>
      {optimizer.edits.length === 0 && <p>Nothing to trim — this prompt is already tight. ✓</p>}
      {optimizer.edits.map((e, i) => (<p key={i} className="edit-line">"{e.from}" → {e.to === '(removed)' ? 'remove' : `"${e.to}"`} <b>−{e.tokensSaved} tok</b></p>))}
      {optimizer.tips.map((t, i) => (<p key={i} className="tip-line">💡 {t}</p>))}
    </div>
  );
}
