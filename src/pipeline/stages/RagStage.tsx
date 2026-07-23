import { useLab } from '../../store';

const barColor = (sim: number) => (sim >= 0.55 ? 'var(--green)' : sim >= 0.35 ? 'var(--amber)' : 'var(--red)');

export function Card({ revealed }: { revealed: boolean }) {
  const retrieval = useLab((s) => s.outcome.retrieval);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      {retrieval.map((r) => (
        <div key={r.docId} className="chunk">
          <span>{r.docId}</span>
          <span className="bar"><i style={{ width: `${r.similarity * 100}%`, background: barColor(r.similarity) }} /></span>
          <b style={{ color: barColor(r.similarity) }}>{r.similarity.toFixed(2)}</b>
        </div>
      ))}
      <div className="stat"><span>top-k retrieved</span><b>{retrieval.filter((r) => r.relevant).length} relevant</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const retrieval = useLab((s) => s.outcome.retrieval);
  const scenario = useLab((s) => s.scenario);
  return (
    <div className="expanded-body">
      <p>RAG embeds your prompt into numbers and searches the document index for the nearest chunks. Specific keywords ("aircraft manuals", "adoption strategy") land near the right documents; vague words land nowhere useful — garbage in, garbage retrieved.</p>
      <ol className="rag-steps"><li>Embed prompt → vector</li><li>Similarity search over {scenario.documents.length} indexed docs</li><li>Top-3 chunks pasted into the context window</li></ol>
      {retrieval.map((r) => (
        <p key={r.docId} className={r.relevant ? 'bonus-line' : 'flag-line'}>
          {r.relevant ? '✓' : '✗'} <b>{r.title}</b> — similarity {r.similarity.toFixed(2)} {r.relevant ? '(passed to the model)' : '(noise)'}
        </p>
      ))}
    </div>
  );
}
