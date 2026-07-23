import { useMemo } from 'react';
import { RULES, useLab } from '../store';
import { scorePrompt } from '../analysis/scorer';
import { analyzeTokens } from '../analysis/tokenizer';
import { simulate } from '../sim/simulate';
import type { Scenario } from '../types';

function Lane({ kind, scenario }: { kind: 'good' | 'bad'; scenario: Scenario }) {
  const prompt = kind === 'good' ? scenario.goodPrompt : scenario.badPrompt;
  const { score, outcome, tokens } = useMemo(() => {
    const score = scorePrompt(prompt, RULES);
    const tokens = analyzeTokens(prompt);
    return { score, tokens, outcome: simulate(score, scenario, prompt, tokens.count) };
  }, [prompt, scenario]);
  const relevant = outcome.retrieval.filter((r) => r.relevant).length;
  return (
    <div className={`cmp-lane lane-${kind}`}>
      <div className="cl-prompt">
        <span className="tag">{kind.toUpperCase()} · {score.score}/100</span>
        {prompt.length > 220 ? `${prompt.slice(0, 220)}…` : prompt}
      </div>
      <div className="cl-flow">
        <div className="mini"><b>ANALYZE</b><span className="v">{score.elements.filter((e) => e.present).length}/7 elements</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>TOKENS</b><span className="v">{tokens.count}{kind === 'bad' ? ' · no signal' : ''}</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>RAG</b><span className="v">{relevant}/3 relevant</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>LLM</b><span className="v">risk: {outcome.hallucinationRisk}</span></div><span className="cl-arrow">▶</span>
        <div className="mini"><b>MCP</b><span className="v">{outcome.tool.called ? (outcome.tool.correct ? 'right tool ✓' : 'wrong tool') : 'no tool call'}</span></div>
      </div>
      <div className="cl-out">
        <span className="big">{outcome.response.grade}</span>
        <p>{outcome.response.nextSteps[0]}</p>
      </div>
    </div>
  );
}

export function Compare() {
  const scenario = useLab((s) => s.scenario);
  return (
    <div>
      <p style={{ padding: '14px 20px 0', margin: 0, color: 'var(--mut)', fontSize: 14 }}>
        Same scenario, two prompts, racing through the same pipeline — <b style={{ color: 'var(--ink)' }}>{scenario.title}</b>.
      </p>
      <Lane kind="good" scenario={scenario} />
      <Lane kind="bad" scenario={scenario} />
    </div>
  );
}
