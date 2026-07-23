import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const score = useLab((s) => s.score);
  if (!revealed) return <div className="stage-body">Waiting for prompt…</div>;
  return (
    <div className="stage-body">
      <div className="badges">
        {score.elements.map((e) => (
          <span key={e.element} className={`bdg ${e.present ? 'y' : 'n'}`}>
            {e.element} {e.present ? '✓' : '✗'}
          </span>
        ))}
      </div>
      <div className="stat"><span>quality score</span><b>{score.score}/100 · {score.band}</b></div>
      {score.flags.length > 0 && <div className="stat"><span>flags</span><b>{score.flags.map((f) => f.label).join(' · ')}</b></div>}
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const score = useLab((s) => s.score);
  return (
    <div className="expanded-body">
      <p>The Analyzer checks your prompt for the seven elements of the PTCF+ framework. Present elements add their weight to the score; flags subtract; bonuses add.</p>
      <table className="detail-table">
        <thead><tr><th>Element</th><th>Weight</th><th>Found</th><th>Evidence / tip</th></tr></thead>
        <tbody>
          {score.elements.map((e) => (
            <tr key={e.element}>
              <td>{e.element}</td><td>{e.weight}</td>
              <td>{e.present ? '✓' : '✗'}</td>
              <td>{e.present ? `"${e.evidence}"` : e.tip}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {score.flags.map((f) => (
        <p key={f.id} className="flag-line">⚠ <b>{f.label}</b> (−{f.penalty}): matched {f.matches.map((m) => `"${m}"`).join(', ')}. {f.advice}</p>
      ))}
      {score.bonuses.map((b) => (<p key={b.id} className="bonus-line">★ <b>{b.label}</b> (+{b.points})</p>))}
    </div>
  );
}
