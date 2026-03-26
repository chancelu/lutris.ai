import { ref, readonly } from 'vue'

// ── Figma MCP Client ──
// Connects to Figma's remote MCP server (https://mcp.figma.com/mcp)
// Uses OAuth for authentication, supports bidirectional design sync

const FIGMA_MCP_ENDPOINT = 'https://mcp.figma.com/mcp'

export interface FigmaNode {
  id: string
  name: string
  type: string
  width?: number
  height?: number
  children?: FigmaNode[]
}

export interface FigmaDesignContext {
  code: string
  framework: string
  nodes: FigmaNode[]
  variables?: Record<string, unknown>
}

export interface FigmaVariable {
  name: string
  type: string
  value: unknown
  collection?: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error'

const status = ref<ConnectionStatus>('disconnected')
const error = ref<string | null>(null)
const accessToken = ref<string | null>(null)
const userName = ref<string | null>(null)
const lastDesignContext = ref<FigmaDesignContext | null>(null)
const lastVariables = ref<FigmaVariable[]>([])
const isLoading = ref(false)

// Persist token in localStorage
const STORAGE_KEY = 'Lutris.ai-figma-token'

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

// ── MCP JSON-RPC helpers ──

let requestId = 0

interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string }
}

async function mcpCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
  if (!accessToken.value) throw new Error('Not authenticated')

  const req: MCPRequest = {
    jsonrpc: '2.0',
    id: ++requestId,
    method,
    params,
  }

  const resp = await fetch(FIGMA_MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`,
    },
    body: JSON.stringify(req),
  })

  if (!resp.ok) {
    if (resp.status === 401) {
      status.value = 'disconnected'
      accessToken.value = null
      saveToken(null)
      throw new Error('Authentication expired. Please reconnect.')
    }
    throw new Error(`MCP request failed: ${resp.status} ${resp.statusText}`)
  }

  const data = (await resp.json()) as MCPResponse
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`)
  }
  return data.result
}

async function callTool(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
  return mcpCall('tools/call', { name: toolName, arguments: args })
}

// ── Public API ──

async function connect() {
  if (status.value === 'connecting' || status.value === 'authenticating') return

  // Try stored token first
  const stored = loadToken()
  if (stored) {
    accessToken.value = stored
    status.value = 'connecting'
    try {
      const identity = (await callTool('whoami')) as { content?: Array<{ text?: string }> }
      const text = identity.content?.[0]?.text
      if (text) {
        try {
          const parsed = JSON.parse(text)
          userName.value = parsed.email ?? parsed.name ?? 'Connected'
        } catch {
          userName.value = text
        }
      }
      status.value = 'connected'
      return
    } catch {
      // Token expired, need re-auth
      accessToken.value = null
      saveToken(null)
    }
  }

  // OAuth flow — open Figma auth in popup
  status.value = 'authenticating'
  error.value = null

  try {
    // For remote MCP, we initiate OAuth via the MCP endpoint
    // The server returns an auth URL we need to open
    const authResp = await fetch(FIGMA_MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'Lutris.ai', version: '0.1.0' },
        },
      }),
    })

    if (!authResp.ok) {
      throw new Error(`Auth init failed: ${authResp.status}`)
    }

    const authData = await authResp.json()

    // If server returns auth URL, open it
    if (authData.result.authUrl) {
      const popup = window.open(authData.result.authUrl, 'figma-auth', 'width=600,height=700')

      // Listen for OAuth callback
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timed out'))
        }, 120000)

        const handler = (event: MessageEvent) => {
          // Validate origin to prevent cross-origin message injection
          if (event.origin !== window.location.origin) return
          if (event.data?.type === 'figma-oauth-callback' && event.data?.token) {
            accessToken.value = event.data.token
            saveToken(event.data.token)
            clearTimeout(timeout)
            window.removeEventListener('message', handler)
            popup?.close()
            resolve()
          }
        }
        window.addEventListener('message', handler)
      })
    }

    // Verify connection
    const identity = (await callTool('whoami')) as { content?: Array<{ text?: string }> }
    const text = identity.content?.[0]?.text
    if (text) {
      try {
        const parsed = JSON.parse(text)
        userName.value = parsed.email ?? parsed.name ?? 'Connected'
      } catch {
        userName.value = text
      }
    }
    status.value = 'connected'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : 'Connection failed'
  }
}

function disconnect() {
  accessToken.value = null
  userName.value = null
  saveToken(null)
  status.value = 'disconnected'
  error.value = null
  lastDesignContext.value = null
  lastVariables.value = []
}

async function getDesignContext(figmaUrl: string, framework = 'react'): Promise<FigmaDesignContext | null> {
  isLoading.value = true
  error.value = null
  try {
    // Extract file key from Figma URL
    const fileMatch = figmaUrl.match(/\/(design|file)\/([^/]+)/)

    if (!fileMatch) throw new Error('Invalid Figma URL')

    const result = (await callTool('get_design_context', {
      url: figmaUrl,
      clientFrameworks: framework,
    })) as { content?: Array<{ text?: string }> }

    const text = result.content?.[0]?.text
    if (!text) throw new Error('No design context returned')

    const context: FigmaDesignContext = {
      code: text,
      framework,
      nodes: [],
      variables: undefined,
    }

    // Try to parse structured data if available
    try {
      const parsed = JSON.parse(text)
      if (parsed.code) context.code = parsed.code
      if (parsed.nodes) context.nodes = parsed.nodes
    } catch {
      // text is raw code, keep as-is
    }

    lastDesignContext.value = context
    return context
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to get design context'
    return null
  } finally {
    isLoading.value = false
  }
}

async function getVariables(figmaUrl: string): Promise<FigmaVariable[]> {
  isLoading.value = true
  error.value = null
  try {
    const result = (await callTool('get_variable_defs', {
      url: figmaUrl,
    })) as { content?: Array<{ text?: string }> }

    const text = result.content?.[0]?.text
    if (!text) return []

    try {
      const parsed = JSON.parse(text)
      const vars: FigmaVariable[] = Array.isArray(parsed) ? parsed : (parsed.variables ?? [])
      lastVariables.value = vars
      return vars
    } catch {
      return []
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to get variables'
    return []
  } finally {
    isLoading.value = false
  }
}

async function getScreenshot(figmaUrl: string): Promise<string | null> {
  isLoading.value = true
  error.value = null
  try {
    const result = (await callTool('get_screenshot', {
      url: figmaUrl,
    })) as { content?: Array<{ type?: string; data?: string }> }

    const img = result.content?.find((c: { type?: string }) => c.type === 'image')
    return img?.data ? `data:image/png;base64,${img.data}` : null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to get screenshot'
    return null
  } finally {
    isLoading.value = false
  }
}

async function pushToFigma(
  targetUrl: string,
  htmlContent: string
): Promise<string | null> {
  isLoading.value = true
  error.value = null
  try {
    const result = (await callTool('generate_figma_design', {
      url: targetUrl,
      html: htmlContent,
    })) as { content?: Array<{ text?: string }> }

    const text = result.content?.[0]?.text
    return text ?? null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to push to Figma'
    return null
  } finally {
    isLoading.value = false
  }
}

async function getMetadata(figmaUrl: string): Promise<string | null> {
  isLoading.value = true
  try {
    const result = (await callTool('get_metadata', {
      url: figmaUrl,
    })) as { content?: Array<{ text?: string }> }
    return result.content?.[0]?.text ?? null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to get metadata'
    return null
  } finally {
    isLoading.value = false
  }
}

export function useFigmaMCP() {
  return {
    // State
    status: readonly(status),
    error: readonly(error),
    userName: readonly(userName),
    isLoading: readonly(isLoading),
    lastDesignContext: readonly(lastDesignContext),
    lastVariables: readonly(lastVariables),

    // Actions
    connect,
    disconnect,
    getDesignContext,
    getVariables,
    getScreenshot,
    pushToFigma,
    getMetadata,
  }
}
