import { useMemo } from 'react';
import { loadGlossary } from '../content/load';
import { RULES } from '../store';

export function CheatSheet() {
  const glossary = useMemo(loadGlossary, []);
  return (
    <div className="cheatsheet">
      <h1 style={{ fontSize: 24 }}>Prompt Engineering Cheat Sheet</h1>
      <p style={{ color: 'var(--mut)' }}>The rules PromptLab scores against. Print me (Ctrl/Cmd+P) and pin me next to your keyboard.</p>
      <h2>Best practices</h2>
      {RULES.bestPractices.map((b) => (
        <div key={b.id} className="bp">
          <span className="src">{b.source === 'user' ? 'CORE' : 'STANDARD'}</span>
          <h3>{b.title}</h3><p>{b.detail}</p>
        </div>
      ))}
      <h2>Glossary</h2>
      {glossary.map((g) => (
        <div key={g.term} className="bp"><h3>{g.term}</h3><p>{g.definition}</p></div>
      ))}
    </div>
  );
}
