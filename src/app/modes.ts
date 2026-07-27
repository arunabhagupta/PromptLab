export const ENABLED_MODES = ['learn', 'cheatsheet'] as const;
export type EnabledMode = (typeof ENABLED_MODES)[number];

export function isEnabledMode(value: string): value is EnabledMode {
  return (ENABLED_MODES as readonly string[]).includes(value);
}
