export type Tool =
  | 'SELECT'
  | 'FRAME'
  | 'SECTION'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'POLYGON'
  | 'STAR'
  | 'TEXT'
  | 'PEN'
  | 'HAND'

export interface ToolDef {
  key: Tool
  label: string
  shortcut: string
  flyout?: Tool[]
}

export const TOOLS: ToolDef[] = [
  { key: 'SELECT', label: 'Move', shortcut: 'V' },
  { key: 'FRAME', label: 'Frame', shortcut: 'F' },
  { key: 'TEXT', label: 'Text', shortcut: 'T' },
  { key: 'HAND', label: 'Hand', shortcut: 'H' }
]

/** Overflow tools shown in the "+" menu */
export const OVERFLOW_TOOLS: ToolDef[] = []

export const TOOL_SHORTCUTS: Partial<Record<string, Tool>> = {
  v: 'SELECT',
  f: 'FRAME',
  s: 'SECTION',
  r: 'RECTANGLE',
  o: 'ELLIPSE',
  l: 'LINE',
  t: 'TEXT',
  p: 'PEN',
  h: 'HAND'
}
