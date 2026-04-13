/**
 * Stitch HTML → Lutris.ai SceneNode importer
 *
 * Strategy: Stitch image > SVG foreignObject screenshot > fallback.
 * Avoids lossy Tailwind→node conversion that produces broken layouts.
 */

import { computeImageHash } from '@open-pencil/core'
import type { SceneGraph, Fill } from '@open-pencil/core'

export interface ImportResult {
  rootId: string
  nodeCount: number
}

const VIEWPORT_WIDTH = 375
const VIEWPORT_HEIGHT = 812

/** Extract clean HTML from Stitch response (may be wrapped in markdown/JSON) */
function extractHtml(raw: string): string {
  let cleaned = raw.trim()
  const mdMatch = cleaned.match(/```(?:html)?\s*\n([\s\S]*?)```/)
  if (mdMatch) cleaned = mdMatch[1].trim()
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned)
      const candidate = parsed.html || parsed.code || parsed.content
      if (typeof candidate === 'string' && candidate.includes('<')) cleaned = candidate
    } catch { /* not JSON */ }
  }
  return cleaned
}

/** Minimal Tailwind CSS subset — enough to render common Stitch output */
const TW_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
.flex{display:flex}.flex-col{flex-direction:column}.flex-row{flex-direction:row}
.inline-flex{display:inline-flex}.grid{display:grid}
.items-center{align-items:center}.items-start{align-items:flex-start}
.items-end{align-items:flex-end}.items-stretch{align-items:stretch}
.justify-center{justify-content:center}.justify-between{justify-content:space-between}
.justify-end{justify-content:flex-end}.justify-start{justify-content:flex-start}
.justify-around{justify-content:space-around}
.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}
.font-bold{font-weight:700}.font-semibold{font-weight:600}
.font-medium{font-weight:500}.font-light{font-weight:300}
/* PLACEHOLDER_1 */
.text-xs{font-size:12px}.text-sm{font-size:14px}.text-base{font-size:16px}
.text-lg{font-size:18px}.text-xl{font-size:20px}.text-2xl{font-size:24px}
.text-3xl{font-size:30px}.text-4xl{font-size:36px}.text-5xl{font-size:48px}
.text-white{color:#fff}.text-black{color:#000}
.text-gray-300{color:#D1D5DB}.text-gray-400{color:#9CA3AF}
.text-gray-500{color:#6B7280}.text-gray-600{color:#4B5563}
.text-gray-700{color:#374151}.text-gray-900{color:#111827}
.bg-white{background:#fff}.bg-black{background:#000}
.bg-gray-50{background:#F9FAFB}.bg-gray-100{background:#F3F4F6}
.bg-gray-200{background:#E5E7EB}.bg-gray-800{background:#1F2937}
.bg-gray-900{background:#111827}.bg-gray-950{background:#030712}
.bg-blue-500{background:#3B82F6}.bg-blue-600{background:#2563EB}
.bg-green-500{background:#22C55E}.bg-red-500{background:#EF4444}
.bg-indigo-500{background:#6366F1}.bg-indigo-600{background:#4F46E5}
.bg-purple-500{background:#A855F7}.bg-yellow-500{background:#EAB308}
.bg-pink-500{background:#EC4899}.bg-orange-500{background:#F97316}
.rounded{border-radius:8px}.rounded-sm{border-radius:2px}
.rounded-md{border-radius:6px}.rounded-lg{border-radius:8px}
.rounded-xl{border-radius:12px}.rounded-2xl{border-radius:16px}
.rounded-3xl{border-radius:24px}.rounded-full{border-radius:9999px}
.p-1{padding:4px}.p-2{padding:8px}.p-3{padding:12px}
.p-4{padding:16px}.p-5{padding:20px}.p-6{padding:24px}.p-8{padding:32px}
.px-2{padding-left:8px;padding-right:8px}.px-3{padding-left:12px;padding-right:12px}
.px-4{padding-left:16px;padding-right:16px}.px-6{padding-left:24px;padding-right:24px}
.py-1{padding-top:4px;padding-bottom:4px}.py-2{padding-top:8px;padding-bottom:8px}
.py-3{padding-top:12px;padding-bottom:12px}.py-4{padding-top:16px;padding-bottom:16px}
.gap-1{gap:4px}.gap-2{gap:8px}.gap-3{gap:12px}.gap-4{gap:16px}.gap-6{gap:24px}
.w-full{width:100%}.h-full{height:100%}.min-h-screen{min-height:100vh}
.overflow-hidden{overflow:hidden}.overflow-auto{overflow:auto}
.relative{position:relative}.absolute{position:absolute}.fixed{position:fixed}
.inset-0{top:0;right:0;bottom:0;left:0}
.top-0{top:0}.bottom-0{bottom:0}.left-0{left:0}.right-0{right:0}
.border{border:1px solid #E5E7EB}.border-gray-200{border-color:#E5E7EB}
.shadow{box-shadow:0 1px 3px rgba(0,0,0,.1)}.shadow-lg{box-shadow:0 10px 15px rgba(0,0,0,.1)}
.opacity-50{opacity:.5}.opacity-75{opacity:.75}
.space-y-1>*+*{margin-top:4px}.space-y-2>*+*{margin-top:8px}
.space-y-3>*+*{margin-top:12px}.space-y-4>*+*{margin-top:16px}
.space-x-2>*+*{margin-left:8px}.space-x-3>*+*{margin-left:12px}
.space-x-4>*+*{margin-left:16px}
.flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}.flex-grow{flex-grow:1}
.flex-wrap{flex-wrap:wrap}
.grid-cols-2{grid-template-columns:repeat(2,1fr)}
.grid-cols-3{grid-template-columns:repeat(3,1fr)}
.grid-cols-4{grid-template-columns:repeat(4,1fr)}
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.leading-tight{line-height:1.25}.leading-none{line-height:1}
.leading-relaxed{line-height:1.625}
.tracking-wide{letter-spacing:.025em}
.uppercase{text-transform:uppercase}
.underline{text-decoration:underline}
.no-underline{text-decoration:none}
.cursor-pointer{cursor:pointer}
img{max-width:100%;height:auto}
.w-4{width:16px}.w-5{width:20px}.w-6{width:24px}.w-8{width:32px}
.w-10{width:40px}.w-12{width:48px}.w-16{width:64px}
.h-4{height:16px}.h-5{height:20px}.h-6{height:24px}.h-8{height:32px}
.h-10{height:40px}.h-12{height:48px}.h-16{height:64px}
.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-4{margin-top:16px}
.mb-1{margin-bottom:4px}.mb-2{margin-bottom:8px}.mb-4{margin-bottom:16px}
.ml-2{margin-left:8px}.mr-2{margin-right:8px}
.mx-auto{margin-left:auto;margin-right:auto}
.z-10{z-index:10}.z-50{z-index:50}
`

/* PLACEHOLDER_RENDER */

/** Render HTML to PNG via SVG foreignObject */
async function renderHtmlToImage(html: string): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const w = VIEWPORT_WIDTH
  const h = VIEWPORT_HEIGHT

  // Escape for XML embedding — encode entities that break SVG
  const escapedCss = TW_CSS.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const escapedHtml = html.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')

  const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;overflow:hidden;">
      <style>${escapedCss}</style>
      ${escapedHtml}
    </div>
  </foreignObject>
</svg>`

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('SVG foreignObject render failed'))
      img.src = url
    })

    const dpr = 2 // retina
    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('canvas.toBlob failed')),
        'image/png',
      )
    })
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function createImageFill(hash: string): Fill {
  return {
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: 'FILL',
    color: { r: 0, g: 0, b: 0, a: 0 },
    opacity: 1,
    visible: true,
  }
}

/**
 * Import Stitch HTML as a rendered screenshot image node.
 */
export async function importStitchHtml(
  html: string,
  parentId: string,
  graph: SceneGraph,
): Promise<ImportResult> {
  const cleaned = extractHtml(html)
  const { bytes, width, height } = await renderHtmlToImage(cleaned)

  const hash = computeImageHash(bytes)
  graph.images.set(hash, bytes)

  const node = graph.createNode('RECTANGLE', parentId, {
    name: 'Stitch Design',
    x: 100, y: 100,
    width, height,
    fills: [createImageFill(hash)],
  })

  return { rootId: node.id, nodeCount: 1 }
}

/**
 * Import base64 image data directly (when Stitch returns an image).
 */
export function importStitchImage(
  base64Data: string,
  mimeType: string,
  parentId: string,
  graph: SceneGraph,
): ImportResult {
  void mimeType
  const raw = atob(base64Data)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const hash = computeImageHash(bytes)
  graph.images.set(hash, bytes)

  const node = graph.createNode('RECTANGLE', parentId, {
    name: 'Stitch Design',
    x: 100, y: 100,
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    fills: [createImageFill(hash)],
  })

  return { rootId: node.id, nodeCount: 1 }
}
