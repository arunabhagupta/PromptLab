import { z } from 'zod';

const elementRule = z.object({ weight: z.number().int().positive(), patterns: z.array(z.string()).min(1), tip: z.string().min(1) });

export const scoringRulesSchema = z.object({
  elements: z.object({
    persona: elementRule, task: elementRule, context: elementRule, format: elementRule,
    examples: elementRule, tone: elementRule, safeguards: elementRule,
  }),
  flags: z.array(z.object({ id: z.string(), label: z.string(), advice: z.string(), penalty: z.number().int().positive(), patterns: z.array(z.string()).min(1) })),
  bonuses: z.array(z.object({ id: z.string(), label: z.string(), points: z.number().int().positive(), patterns: z.array(z.string()).min(1) })),
  fillers: z.array(z.object({ pattern: z.string(), replacement: z.string() })),
  bestPractices: z.array(z.object({ id: z.string(), title: z.string(), detail: z.string(), source: z.enum(['user', 'standard']) })),
});

export const scenarioSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(),
  goodPrompt: z.string().min(50), badPrompt: z.string().min(5),
  documents: z.array(z.object({ id: z.string(), title: z.string(), keywords: z.array(z.string()).min(1) })).min(3),
  tools: z.array(z.object({ name: z.string(), goodArgs: z.string(), description: z.string() })).min(2),
  responses: z.object({ excellent: z.string(), good: z.string(), fair: z.string(), poor: z.string() }),
});

const stageOrComposer = z.enum(['analyzer', 'tokenizer', 'rag', 'llm', 'mcp', 'response', 'composer', 'none']);
export const lessonSchema = z.object({
  id: z.string(), order: z.number().int().positive(), title: z.string(), scenarioId: z.string(),
  steps: z.array(z.object({
    spotlight: stageOrComposer, heading: z.string(), body: z.string(),
    prompt: z.string().optional(), variant: z.enum(['good', 'bad', 'compare']).optional(),
  })).min(2),
  challenge: z.object({
    brief: z.string(),
    requiredElements: z.array(z.enum(['persona', 'task', 'context', 'format', 'examples', 'tone', 'safeguards'])).min(1),
  }),
});

export const glossarySchema = z.array(z.object({ term: z.string(), definition: z.string() }));
