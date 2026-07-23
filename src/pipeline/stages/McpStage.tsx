import { useLab } from '../../store';

export function Card({ revealed }: { revealed: boolean }) {
  const { tool } = useLab((s) => s.outcome);
  const tools = useLab((s) => s.scenario.tools);
  if (!revealed) return <div className="stage-body">—</div>;
  return (
    <div className="stage-body">
      {tools.map((t) => {
        const selected = tool.called && tool.name === t.name;
        return (
          <div key={t.name} className="stat" style={selected ? { color: 'var(--ink)' } : undefined}>
            <span>{selected ? '▸ ' : ''}{t.name}({selected ? tool.args : ''})</span>
            {selected && <b style={{ color: tool.correct ? 'var(--magenta)' : 'var(--red)' }}>{tool.correct ? '✓' : 'wrong tool'}</b>}
          </div>
        );
      })}
      <div className="stat"><span>tool match</span><b>{tool.called ? (tool.correct ? 'correct · params ok' : 'incorrect guess') : 'no call — task unclear'}</b></div>
    </div>
  );
}

export function Expanded({ revealed: _r }: { revealed: boolean }) {
  const { tool } = useLab((s) => s.outcome);
  const tools = useLab((s) => s.scenario.tools);
  return (
    <div className="expanded-body">
      <p>Via MCP (Model Context Protocol) the model discovers available tools and decides — from your prompt alone — whether to call one, which, and with what arguments. A clear task with specific keywords becomes a correct call; a vague one becomes a guess or no call at all.</p>
      {tools.map((t) => (<p key={t.name} className="stat"><span><b>{t.name}</b> — {t.description}</span></p>))}
      <p className={tool.correct ? 'bonus-line' : 'flag-line'}>
        {tool.called ? `Model called ${tool.name}(${tool.args}) — ${tool.correct ? 'exactly right.' : 'a guess, because the task was underspecified.'}` : 'Model made no tool call: it couldn\'t tell what action you wanted.'}
      </p>
    </div>
  );
}
