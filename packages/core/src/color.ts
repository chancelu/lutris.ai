import { parse, formatHex, formatHex8, formatRgb, converter, differenceEuclidean } from 'culori'

import { BLACK } from './constants'

import type { Color } from './types'
import type { Fill, GradientStop } from './scene-graph'

const toRgb = converter('rgb')

export function parseColor(input: string): Color {
  const parsed = parse(input)
  if (!parsed) return { ...BLACK }
  const rgb = toRgb(parsed)
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    a: parsed.alpha ?? 1
  }
}

export function normalizeColor(color?: Partial<Color>): Color {
  if (!color) return { ...BLACK }
  return { r: color.r ?? 0, g: color.g ?? 0, b: color.b ?? 0, a: color.a ?? 1 }
}

export function colorToHex(color: Color): string {
  return formatHex({ mode: 'rgb', r: color.r, g: color.g, b: color.b }).toUpperCase()
}

export function colorToHex8(color: Color, alpha?: number): string {
  const a = alpha ?? color.a
  if (a >= 1) return colorToHex(color)
  return (
    formatHex8({ mode: 'rgb', r: color.r, g: color.g, b: color.b, alpha: a })
  ).toUpperCase()
}

export function colorToHexRaw(color: Color): string {
  return colorToHex(color).slice(1)
}

export function colorToRgba255(color: Color) {
  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
    a: color.a
  }
}

export function colorToCSS(color: Color): string {
  return formatRgb({ mode: 'rgb', r: color.r, g: color.g, b: color.b, alpha: color.a })
}

export function colorToCSSCompact(color: Color): string {
  const { r, g, b } = colorToRgba255(color)
  const a = Number(color.a.toFixed(3))
  if (a >= 1) return `rgb(${r},${g},${b})`
  return `rgba(${r},${g},${b},${a})`
}

export function rgba255ToColor(r: number, g: number, b: number, a = 1): Color {
  return { r: r / 255, g: g / 255, b: b / 255, a }
}

export function colorToFill(color: string | Color) {
  const rgba = typeof color === 'string' ? parseColor(color) : color
  return {
    type: 'SOLID' as const,
    color: { r: rgba.r, g: rgba.g, b: rgba.b, a: 1 },
    opacity: rgba.a,
    visible: true
  }
}

const euclideanRgb255 = differenceEuclidean('rgb')

export function colorDistance(c1: Color, c2: Color): number {
  return euclideanRgb255(
    { mode: 'rgb', r: c1.r, g: c1.g, b: c1.b },
    { mode: 'rgb', r: c2.r, g: c2.g, b: c2.b }
  ) * 255
}

// CSS 风格渐变字符串 → 渐变 Fill。JSX 的 bg prop 此前只接受 hex——AI 连渐变都
// 表达不了，设计稿只剩纯色块（"纯色按钮丑"的工具层根因）。Skia 渲染管线本身
// 完整支持渐变（renderer/fills.ts），缺的只是这个解析入口。
// 支持：
//   linear-gradient(135deg, #10B981, #22D3EE)     角度为 CSS 约定（0deg=向上，90deg=向右）
//   linear-gradient(180deg, #A 0%, #B 100%)       色标位置可选（默认均分）
//   radial-gradient(circle at 30% 20%, #A, #B)    at 可省略（默认 50% 50%）
// 透明度用 8 位 hex（如 #10B98100）表达。
export function parseGradientFill(input: string): Fill | null {
  const trimmed = input.trim()
  const linear = /^linear-gradient\(\s*(-?[\d.]+)deg\s*,\s*(.+)\)$/i.exec(trimmed)
  const radial = /^radial-gradient\(\s*circle(?:\s+at\s+([\d.]+)%\s+([\d.]+)%)?\s*,\s*(.+)\)$/i.exec(trimmed)
  if (!linear && !radial) return null

  const stopsSrc = (linear ? linear[2] : (radial as RegExpExecArray)[3])
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (stopsSrc.length < 2) return null

  const stops: GradientStop[] = []
  for (let i = 0; i < stopsSrc.length; i++) {
    const m = /^(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)(?:\s+([\d.]+)%)?$/.exec(stopsSrc[i])
    if (!m) return null
    stops.push({
      color: parseColor(m[1]),
      position:
        (m[2] as string | undefined) !== undefined
          ? Math.min(1, Math.max(0, parseFloat(m[2]) / 100))
          : i / (stopsSrc.length - 1),
    })
  }

  if (linear) {
    // gradientTransform 语义（renderer/fills.ts）：start=(m02,m12)·size，
    // end=(m00+m02, m10+m12)·size。CSS 角度 0deg=向上、90deg=向右。
    const rad = (parseFloat(linear[1]) * Math.PI) / 180
    const dx = Math.sin(rad)
    const dy = -Math.cos(rad)
    return {
      type: 'GRADIENT_LINEAR',
      color: stops[0].color,
      opacity: 1,
      visible: true,
      gradientStops: stops,
      gradientTransform: {
        m00: dx, m01: 0, m02: 0.5 - dx / 2,
        m10: dy, m11: 0, m12: 0.5 - dy / 2,
      },
    }
  }

  const r = radial as RegExpExecArray
  const atX = r[1] as string | undefined
  const atY = r[2] as string | undefined
  const cx = atX !== undefined ? parseFloat(atX) / 100 : 0.5
  const cy = atY !== undefined ? parseFloat(atY) / 100 : 0.5
  return {
    type: 'GRADIENT_RADIAL',
    color: stops[0].color,
    opacity: 1,
    visible: true,
    gradientStops: stops,
    // 半径 = sqrt(m00²+m10²)·max(w,h)，取 0.75 让径向渐变自然溢出边缘
    gradientTransform: { m00: 0.75, m01: 0, m02: cx, m10: 0, m11: 0, m12: cy },
  }
}
