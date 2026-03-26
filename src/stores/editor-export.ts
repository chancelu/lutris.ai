import { IS_TAURI } from '@/constants'
import {
  exportFigFile,
  renderNodesToImage,
  renderNodesToSVG
} from '@open-pencil/core'

import type { ExportFormat } from '@open-pencil/core'
import type { EditorContext } from './editor-types'

function downloadBlob(data: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

function exportImageExtension(format: ExportFormat): string {
  switch (format) {
    case 'JPG':
      return '.jpg'
    case 'WEBP':
      return '.webp'
    default:
      return '.png'
  }
}

function exportImageMime(format: ExportFormat): string {
  switch (format) {
    case 'JPG':
      return 'image/jpeg'
    case 'WEBP':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

export function createExportOps(ctx: EditorContext) {
  function buildFigFile() {
    return exportFigFile(
      ctx.graph(),
      ctx.ck() ?? undefined,
      ctx.renderer() ?? undefined,
      ctx.state.currentPageId
    )
  }

  async function renderExportImage(
    nodeIds: string[],
    scale: number,
    format: ExportFormat
  ): Promise<Uint8Array | null> {
    const ck = ctx.ck()
    const renderer = ctx.renderer()
    if (!ck || !renderer) return null
    const ids =
      nodeIds.length > 0
        ? nodeIds
        : ctx.graph().getChildren(ctx.state.currentPageId).map((n) => n.id)
    if (ids.length === 0) return null
    return renderNodesToImage(ck, renderer, ctx.graph(), ctx.state.currentPageId, ids, {
      scale,
      format
    })
  }

  async function saveExportedFile(
    data: Uint8Array,
    fileName: string,
    format: string,
    ext: string,
    mime: string
  ) {
    if (IS_TAURI) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: format, extensions: [ext.slice(1)] }]
      })
      if (!path) return
      const { writeFile: tauriWrite } = await import('@tauri-apps/plugin-fs')
      await tauriWrite(path, data)
      return
    }

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: `${format} file`,
              accept: { [mime]: [ext] }
            }
          ]
        })
        const writable = await handle.createWritable()
        await writable.write(new Uint8Array(data))
        await writable.close()
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }

    downloadBlob(data, fileName, mime)
  }

  async function exportSelection(
    scale: number,
    format: ExportFormat,
    customName?: string
  ): Promise<void> {
    const ids = [...ctx.state.selectedIds]

    if (format === 'SVG') {
      const nodeIds =
        ids.length > 0 ? ids : ctx.graph().getChildren(ctx.state.currentPageId).map((n) => n.id)
      const svgStr = renderNodesToSVG(ctx.graph(), ctx.state.currentPageId, nodeIds)
      if (!svgStr) {
        console.error('Export failed: renderNodesToSVG returned null')
        return
      }
      const svgData = new TextEncoder().encode(svgStr)
      const node = ids.length === 1 ? ctx.graph().getNode(ids[0]) : undefined
      const fileName = `${customName || node?.name || 'Export'}.svg`
      await saveExportedFile(svgData, fileName, 'SVG', '.svg', 'image/svg+xml')
      return
    }

    const data = await renderExportImage(ids, scale, format)
    if (!data) {
      console.error(
        `Export failed: renderExportImage returned null for format=${format} scale=${scale}`
      )
      return
    }

    const node = ids.length === 1 ? ctx.graph().getNode(ids[0]) : undefined
    const baseName = customName || node?.name || 'Export'
    const ext = exportImageExtension(format)
    const fileName = `${baseName}@${scale}x${ext}`
    await saveExportedFile(new Uint8Array(data), fileName, format, ext, exportImageMime(format))
  }

  async function saveFigFile() {
    if (ctx.filePath() || ctx.fileHandle()) {
      await ctx.writeFile(await buildFigFile())
    } else {
      const name = ctx.downloadName()
      if (name) {
        downloadBlob(
          new Uint8Array(await buildFigFile()),
          name,
          'application/octet-stream'
        )
      } else {
        await saveFigFileAs()
      }
    }
  }

  async function saveFigFileAs() {
    const data = await buildFigFile()

    if (IS_TAURI) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const path = await save({
        defaultPath: 'Untitled.fig',
        filters: [{ name: 'Figma file', extensions: ['fig'] }]
      })
      if (!path) return
      ctx.setFilePath(path)
      ctx.setFileHandle(null)
      ctx.state.documentName =
        path
          .split('/')
          .pop()
          ?.replace(/\.fig$/i, '') ?? 'Untitled'
      await ctx.writeFile(data)
      void ctx.startWatchingFile()
      return
    }

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'Untitled.fig',
          types: [
            {
              description: 'Figma file',
              accept: { 'application/octet-stream': ['.fig'] }
            }
          ]
        })
        ctx.setFileHandle(handle)
        ctx.setFilePath(null)
        ctx.state.documentName = handle.name.replace(/\.fig$/i, '')
        await ctx.writeFile(data)
        void ctx.startWatchingFile()
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }

    const filename = prompt('Save as:', ctx.downloadName() ?? 'Untitled.fig')
    if (!filename) return
    ctx.setDownloadName(filename)
    ctx.state.documentName = filename.replace(/\.fig$/i, '')
    downloadBlob(new Uint8Array(data), filename, 'application/octet-stream')
  }

  return {
    buildFigFile,
    renderExportImage,
    exportSelection,
    saveFigFile,
    saveFigFileAs
  }
}
