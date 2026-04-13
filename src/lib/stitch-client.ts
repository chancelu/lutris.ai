/**
 * Stitch MCP Client — thin wrapper over the Vercel proxy
 *
 * MCP tools return { content: [{ type: "text", text: "..." }, ...] }
 * This client extracts the text/image content from MCP responses.
 */

const PROXY_URL = '/api/stitch-mcp'

interface McpContentItem {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

interface McpToolResult {
  content: McpContentItem[]
  isError?: boolean
}

interface McpResponse {
  jsonrpc: string
  id: number
  result?: McpToolResult
  error?: { code: number; message: string }
}

// Cached default project ID — auto-created on first use
let defaultProjectId: string | null = null

async function mcpCall(method: string, params?: Record<string, unknown>): Promise<McpToolResult> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    const detail = (err as { detail?: string }).detail
    const msg = (err as { error?: string }).error || `Stitch proxy error (${res.status})`
    throw new Error(detail ? `${msg}: ${detail}` : msg)
  }

  const data = (await res.json()) as McpResponse
  if (data.error) {
    throw new Error(data.error.message || `MCP error ${data.error.code}`)
  }
  if (!data.result) {
    throw new Error('Empty MCP response')
  }
  if (data.result.isError) {
    const errText = data.result.content?.map(c => c.text).filter(Boolean).join(' ') || 'Unknown Stitch error'
    throw new Error(errText)
  }
  return data.result
}

/** Extract all text content from an MCP tool result */
function extractText(result: McpToolResult): string {
  return result.content
    .filter(c => c.type === 'text' && c.text)
    .map(c => c.text!)
    .join('\n')
}

/** Extract image data from an MCP tool result */
function extractImage(result: McpToolResult): { data: string; mimeType: string } | null {
  const img = result.content.find(c => c.type === 'image' && c.data)
  return img ? { data: img.data!, mimeType: img.mimeType || 'image/png' } : null
}

/** Try to parse JSON from text content */
function parseJsonContent<T>(result: McpToolResult): T | null {
  const text = extractText(result)
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function callTool(toolName: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
  return mcpCall('tools/call', { name: toolName, arguments: args })
}

/** Ensure we have a default project to generate screens in */
async function ensureProject(): Promise<string> {
  if (defaultProjectId) return defaultProjectId

  // Try to find existing projects first
  const listResult = await callTool('list_projects')
  const parsed = parseJsonContent<{ projects?: Array<{ name: string }> }>(listResult)
  if (parsed?.projects?.length) {
    // Extract project ID from resource name "projects/123"
    const name = parsed.projects[0].name
    defaultProjectId = name.includes('/') ? name.split('/').pop()! : name
    return defaultProjectId
  }

  // Create a new project
  const createResult = await callTool('create_project', { title: 'Lutris AI Designs' })
  const created = parseJsonContent<{ name?: string }>(createResult)
  if (created?.name) {
    defaultProjectId = created.name.includes('/') ? created.name.split('/').pop()! : created.name
    return defaultProjectId
  }

  throw new Error('Failed to create Stitch project')
}

export interface GenerateResult {
  text: string
  image: { data: string; mimeType: string } | null
  screenName?: string
}

export async function generateScreen(prompt: string, opts?: { projectId?: string }): Promise<GenerateResult> {
  const projectId = opts?.projectId || await ensureProject()

  console.log('[stitch-client] generateScreen:', { projectId, prompt: prompt.slice(0, 50) })

  const result = await callTool('generate_screen_from_text', {
    prompt,
    projectId,
  })

  console.log('[stitch-client] raw result:', JSON.stringify(result).slice(0, 500))

  return {
    text: extractText(result),
    image: extractImage(result),
  }
}

export async function getScreen(projectId: string, screenId: string): Promise<GenerateResult> {
  const result = await callTool('get_screen', {
    name: `projects/${projectId}/screens/${screenId}`,
    projectId,
    screenId,
  })
  return {
    text: extractText(result),
    image: extractImage(result),
  }
}

export async function listProjects(): Promise<Array<{ name: string; title?: string }>> {
  const result = await callTool('list_projects')
  const parsed = parseJsonContent<{ projects?: Array<{ name: string; title?: string }> }>(result)
  return parsed?.projects ?? []
}

export async function listScreens(projectId: string): Promise<Array<{ name: string }>> {
  const result = await callTool('list_screens', { projectId })
  const parsed = parseJsonContent<{ screens?: Array<{ name: string }> }>(result)
  return parsed?.screens ?? []
}