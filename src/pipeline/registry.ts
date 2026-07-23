import type { ComponentType } from 'react';
import type { StageId } from '../types';
import * as Analyzer from './stages/AnalyzerStage';
import * as Tokenizer from './stages/TokenizerStage';
import * as Rag from './stages/RagStage';
import * as Llm from './stages/LlmStage';
import * as Mcp from './stages/McpStage';
import * as Response from './stages/ResponseStage';

export interface StageProps { revealed: boolean }
export interface StageDef {
  id: StageId; title: string; colorVar: string; order: number;
  Card: ComponentType<StageProps>; Expanded: ComponentType<StageProps>;
}

export const stageRegistry: StageDef[] = [
  { id: 'analyzer', title: 'PROMPT ANALYZER', colorVar: 'var(--violet)', order: 0, ...Analyzer },
  { id: 'tokenizer', title: 'TOKENIZER', colorVar: 'var(--cyan)', order: 1, ...Tokenizer },
  { id: 'rag', title: 'RAG RETRIEVAL', colorVar: 'var(--amber)', order: 2, ...Rag },
  { id: 'llm', title: 'LLM CORE', colorVar: 'var(--blue)', order: 3, ...Llm },
  { id: 'mcp', title: 'TOOLS / MCP', colorVar: 'var(--magenta)', order: 4, ...Mcp },
  { id: 'response', title: 'RESPONSE', colorVar: 'var(--green)', order: 5, ...Response },
];
