import { useMemo, useState } from 'react';
import { loadLessons } from '../content/load';
import { RULES, useLab } from '../store';
import { scorePrompt } from '../analysis/scorer';
import { PipelineCanvas } from '../pipeline/Canvas';
import type { Lesson } from '../types';

const DONE_KEY = 'promptlab.lessons.done';
const readDone = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
};

function Challenge({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [draft, setDraft] = useState('');
  const result = useMemo(() => (draft.trim() ? scorePrompt(draft, RULES) : null), [draft]);
  const missing = result ? lesson.challenge.requiredElements.filter(
    (el) => !result.elements.find((e) => e.element === el)!.present) : lesson.challenge.requiredElements;
  const passed = result !== null && missing.length === 0;
  return (
    <div className="challenge">
      <h4>PRACTICE CHALLENGE</h4>
      <p>{lesson.challenge.brief}</p>
      <textarea className="promptbox" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft your prompt here…" />
      {result && (
        <p className="result" style={{ color: passed ? 'var(--green)' : 'var(--amber)' }}>
          Score {result.score}/100 · {passed ? '✓ all required elements present — challenge complete!' : `still missing: ${missing.join(', ')}`}
        </p>
      )}
      {passed && <button className="runbtn" style={{ marginTop: 8 }} onClick={onDone}>✓ Mark lesson complete</button>}
    </div>
  );
}

export function Learn() {
  const lessons = useMemo(loadLessons, []);
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(readDone);
  const setPrompt = useLab((s) => s.setPrompt);
  const setScenario = useLab((s) => s.setScenario);
  const lesson = lessons.find((l) => l.id === activeId)!;
  const step = lesson.steps[stepIdx];
  const atEnd = stepIdx === lesson.steps.length - 1;

  const goTo = (l: Lesson, idx: number) => {
    setScenario(l.scenarioId);
    setActiveId(l.id); setStepIdx(idx);
    const s = l.steps[idx];
    if (s.prompt) setPrompt(s.prompt, s.variant === 'bad' ? 'bad' : s.variant === 'good' ? 'good' : 'custom');
  };
  const markDone = () => {
    const next = [...new Set([...done, lesson.id])];
    setDone(next);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* completion persists for this session only */ }
  };

  return (
    <div className="learn">
      <aside className="lessons">
        <div className="lbl" style={{ margin: '4px 6px 10px' }}>Lessons</div>
        {lessons.map((l) => (
          <button key={l.id} className={`lesson ${l.id === activeId ? 'on' : ''} ${done.includes(l.id) ? 'done' : ''}`} onClick={() => goTo(l, 0)}>
            <span className="num">{done.includes(l.id) ? '✓' : String(l.order).padStart(2, '0')}</span>{l.title}
          </button>
        ))}
      </aside>
      <div className="learn-canvas">
        <div className={step.spotlight !== 'none' && step.spotlight !== 'composer' ? 'spot-dim' : ''}>
          <PipelineCanvas spotlight={step.spotlight} />
        </div>
        <div className="narr" role="region" aria-label="Lesson narration">
          <span className="step-eyebrow">Lesson {lesson.order} · step {stepIdx + 1} of {lesson.steps.length}</span>
          <h4>{step.heading}</h4>
          <p>{step.body}</p>
          <div className="nav">
            <button disabled={stepIdx === 0} onClick={() => goTo(lesson, stepIdx - 1)}>← Back</button>
            {!atEnd && <button className="next" onClick={() => goTo(lesson, stepIdx + 1)}>Next →</button>}
            <span className="dots">{lesson.steps.map((_s, i) => (<i key={i} className={i <= stepIdx ? 'on' : ''} />))}</span>
          </div>
        </div>
        {atEnd && <Challenge lesson={lesson} onDone={markDone} />}
      </div>
    </div>
  );
}
