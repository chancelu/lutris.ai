import type { Color, Rect, SceneGraph, SceneNode, SkiaRenderer, SnapGuide, UndoManager } from '@open-pencil/core'
import type { CanvasKit } from 'canvaskit-wasm'
import type { Tool } from './tools'

export interface EditorState {
  activeTool: Tool
  currentPageId: string
  selectedIds: Set<string>
  marquee: Rect | null
  snapGuides: SnapGuide[]
  rotationPreview: { nodeId: string; angle: number } | null
  dropTargetId: string | null
  layoutInsertIndicator: {
    parentId: string
    index: number
    x: number
    y: number
    length: number
    direction: 'HORIZONTAL' | 'VERTICAL'
  } | null
  hoveredNodeId: string | null
  editingTextId: string | null
  penState: unknown
  penCursorX: number | null
  penCursorY: number | null
  cursorCanvasX: number | null
  cursorCanvasY: number | null
  remoteCursors: Array<{
    name: string
    color: Color
    x: number
    y: number
    selection?: string[]
  }>
  showUI: boolean
  documentName: string
  panX: number
  pageColor: Color
  panY: number
  zoom: number
  renderVersion: number
  sceneVersion: number
  loading: boolean
  activeRibbonTab: 'panels' | 'code' | 'ai' | 'handoff'
  measurementMode: boolean
  _altMeasurement: boolean
  panelMode: 'layers' | 'design'
  actionToast: string | null
  mobileDrawerSnap: 'closed' | 'half' | 'full'
  clipboardHtml: string
  autosaveEnabled: boolean
  leftPanelCollapsed: boolean
  leftPanelTab: 'layers' | 'assets' | 'pages' | null
}

export interface EditorContext {
  graph(): SceneGraph
  ck(): CanvasKit | null
  renderer(): SkiaRenderer | null
  state: EditorState
  undo: UndoManager
  selectedNodes(): SceneNode[]
  requestRender(): void
  requestRepaint(): void
  loadFontsForNodes(nodeIds: string[], targetPageId?: string, refitViewport?: boolean): Promise<void>
  toast(message: string, type: 'warning' | 'error'): void

  // File management accessors (used by export ops)
  fileHandle(): FileSystemFileHandle | null
  filePath(): string | null
  downloadName(): string | null
  setFileHandle(handle: FileSystemFileHandle | null): void
  setFilePath(path: string | null): void
  setDownloadName(name: string | null): void
  writeFile(data: Uint8Array): Promise<void>
  startWatchingFile(): Promise<void>
}
