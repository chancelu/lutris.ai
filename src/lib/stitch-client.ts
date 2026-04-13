/**
 * Stitch MCP Client — thin wrapper over the Vercel proxy
 */

const PROXY_URL = '/api/stitch-mcp'

interface McpResponse<T = unknown> {
  jsonrpc: string
  id: number
  result?: T
  error?: { code: number; message: string }
}

interface StitchTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

let toolsCache: StitchTool[] | null = null

async function mcpCall<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error((err as { error?: string }).error || `Stitch proxy error (${res.status})`)
  }

  const data = (await res.json()) as McpResponse<T>
  if (data.error) {
    throw new Error(data.error.message || `MCP error ${data.error.code}`)
  }
  return data.result as T
}

async function callTool<T = unknown>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
  return mcpCall<T>('tools/call', { name: toolName, arguments: args })
}

export async function discoverTools(): Promise<StitchTool[]> {
  if (toolsCache) return toolsCache
  const result = await mcpCall<{ tools: StitchTool[] }>('tools/list')
  toolsCache = result.tools
  return toolsCache
}

export interface StitchProject {
  id: string
  name: string
  screenCount?: number
}

export interface StitchScreen {
  id: string
  name: string
  projectId: string
}

export interface ScreenCode {
  html: string
  css?: string
}

export interface ScreenImage {
  imageUrl?: string
  base64?: string
  mimeType?: string
}

export interface GenerateResult {
  html: string
  screenId?: string
  imageUrl?: string
  base64?: string
  mimeType?: string
}

export async function listProjects(): Promise<StitchProject[]> {
  const result = await callTool<{ projects: StitchProject[] }>('list_projects')
  return result.projects ?? []
}

export async function listScreens(projectId: string): Promise<StitchScreen[]> {
  const result = await callTool<{ screens: StitchScreen[] }>('list_screens', { project_id: projectId })
  return result.screens ?? []
}

export async function getScreenCode(screenId: string): Promise<ScreenCode> {
  return callTool<ScreenCode>('fetch_screen_code', { screen_id: screenId })
}

export async function getScreenImage(screenId: string): Promise<ScreenImage> {
  return callTool<ScreenImage>('fetch_screen_image', { screen_id: screenId })
}

export async function generateScreen(prompt: string, opts?: { projectId?: string }): Promise<GenerateResult> {
  return callTool<GenerateResult>('generate_screen_from_text', {
    prompt,
    ...(opts?.projectId ? { project_id: opts.projectId } : {}),
  })
}

export async function extractDesignContext(screenId: string): Promise<Record<string, unknown>> {
  return callTool<Record<string, unknown>>('extract_design_context', { screen_id: screenId })
}