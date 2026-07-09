const BASE = 'https://api.figma.com/v1'

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(token: string, path: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${BASE}${path}`, { headers: headers(token) })
    if (res.status === 429 && attempt < retries - 1) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '0', 10) || (2 ** attempt)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      continue
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Figma API ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  }
  throw new Error('Figma API: max retries exceeded')
}

export interface FigmaUser {
  id: string
  handle: string
  img_url: string
  email: string
}

export interface FigmaFileEntry {
  key: string
  name: string
  thumbnail_url: string
  last_modified: string
}

export interface FigmaProject {
  id: number
  name: string
}

export interface FigmaTeam {
  id: string
  name: string
}

export function getMe(token: string): Promise<FigmaUser> {
  return request<FigmaUser>(token, '/me')
}

export async function getRecentFiles(token: string): Promise<FigmaFileEntry[]> {
  const data = await request<{ files: FigmaFileEntry[] }>(token, '/me/files/recent')
  return data.files ?? []
}

export async function getTeamProjects(token: string, teamId: string): Promise<FigmaProject[]> {
  const data = await request<{ projects: FigmaProject[] }>(token, `/teams/${teamId}/projects`)
  return data.projects ?? []
}

export async function getProjectFiles(token: string, projectId: string): Promise<FigmaFileEntry[]> {
  const data = await request<{ files: FigmaFileEntry[] }>(token, `/projects/${projectId}/files`)
  return data.files ?? []
}

export interface FigmaFileResponse {
  name: string
  document: FigmaNode
  components: Record<string, unknown>
  schemaVersion: number
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
  fills?: FigmaFill[]
  strokes?: FigmaFill[]
  strokeWeight?: number
  strokeAlign?: string
  strokeCap?: string
  strokeJoin?: string
  strokeDashes?: number[]
  effects?: FigmaEffect[]
  opacity?: number
  visible?: boolean
  locked?: boolean
  clipsContent?: boolean
  blendMode?: string
  cornerRadius?: number
  rectangleCornerRadii?: [number, number, number, number]
  cornerSmoothing?: number
  rotation?: number
  characters?: string
  style?: FigmaTextStyle
  characterStyleOverrides?: number[]
  styleOverrideTable?: Record<string, FigmaTextStyle>
  layoutMode?: string
  layoutWrap?: string
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  primaryAxisSizingMode?: string
  counterAxisSizingMode?: string
  itemSpacing?: number
  counterAxisSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  layoutPositioning?: string
  layoutGrow?: number
  layoutAlign?: string
  constraints?: { horizontal: string; vertical: string }
  isMask?: boolean
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number }
  componentId?: string
}

export interface FigmaTextStyle {
  fontFamily?: string
  fontWeight?: number
  fontSize?: number
  italic?: boolean
  textAlignHorizontal?: string
  textAlignVertical?: string
  textAutoResize?: string
  textCase?: string
  textDecoration?: string
  lineHeightPx?: number
  letterSpacing?: number
}

export interface FigmaFill {
  type: string
  color?: { r: number; g: number; b: number; a: number }
  opacity?: number
  visible?: boolean
  blendMode?: string
  gradientStops?: { color: { r: number; g: number; b: number; a: number }; position: number }[]
  gradientHandlePositions?: { x: number; y: number }[]
  imageRef?: string
  scaleMode?: string
}

export interface FigmaEffect {
  type: string
  color?: { r: number; g: number; b: number; a: number }
  offset?: { x: number; y: number }
  radius?: number
  spread?: number
  visible?: boolean
  blendMode?: string
}

export function getFile(token: string, fileKey: string, depth = 2): Promise<FigmaFileResponse> {
  return request<FigmaFileResponse>(token, `/files/${fileKey}?geometry=paths&depth=${depth}`)
}
