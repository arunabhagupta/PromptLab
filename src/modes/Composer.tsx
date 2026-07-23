import { useLab } from '../store';

export function Composer() {
  const promptText = useLab((s) => s.promptText);
  const score = useLab((s) => s.score);
  const tokens = useLab((s) => s.tokens);
  const optimizer = useLab((s) => s.optimizer);
  const setPrompt = useLab((s) => s.setPrompt);
  const run = useLab((s) => s.run);
  const resetRun = useLab((s) => s.resetRun);
  const saved = optimizer.originalTokens - optimizer.optimizedTokens;
  return (
    <aside className="composer">
      <div>
        <label className="lbl" htmlFor="prompt-input">Your prompt · {tokens.count} tokens</label>
        <textarea id="prompt-input" className="promptbox" value={promptText}
          onChange={(e) => { setPrompt(e.target.value); resetRun(); }} />
      </div>
      <div>
        <div className="lbl" style={{ marginBottom: 6 }}>Prompt elements — score {score.score}/100 · {score.band}</div>
        <div className="checks">
          {score.elements.map((e) => (
            <span key={e.element} className={`chk ${e.present ? 'ok' : 'miss'}`} title={e.present ? e.evidence : e.tip}>
              <span className="m">{e.present ? '✓' : '✗'}</span>{e.element}
            </span>
          ))}
        </div>
      </div>
      {saved > 0 && (
        <div className="opt-tip">💡<div><b>Save {saved} tokens:</b> {optimizer.edits.slice(0, 2).map((e) => `"${e.from}" → ${e.to}`).join('; ')}. Open the Tokenizer stage for the full diff.</div></div>
      )}
      <button className="runbtn" onClick={run}>▶ RUN THROUGH PIPELINE</button>
    </aside>
  );
}
