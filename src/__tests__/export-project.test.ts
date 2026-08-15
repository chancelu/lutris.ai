// 可运行工程包导出：React CSS 拆分、Vue/React 文件表、zip 内容校验
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import {
  buildProjectFiles,
  buildProjectZip,
  splitReactCss,
} from '@/lib/export-project'

// 与 packages/core/src/render/export-code.ts generateReact 的实际输出同构
const REACT_EXPORT = `import './styles.css'

export function Typography() {
  return (
    <div className="typography-0">
      <p className="heading-1">Heading</p>
    </div>
  )
}

/* styles.css */
/*
.typography-0 {
  position: absolute;
  left: 700px;
}

.heading-1 {
  font-size: 24px;
}
*/`

const VUE_EXPORT = `<script setup lang="ts">
// Dashboard — generated from design
</script>

<template>
  <div class="dashboard-0">
    <p class="title-1">Total revenue</p>
  </div>
</template>

<style scoped>
.dashboard-0 {
  display: flex;
}
</style>`

describe('splitReactCss', () => {
  it('把内嵌 CSS 注释块拆成独立的 tsx 与 css', () => {
    const { tsx, css } = splitReactCss(REACT_EXPORT)
    expect(tsx).toContain("import './styles.css'")
    expect(tsx).toContain('export function Typography()')
    expect(tsx).not.toContain('/* styles.css */')
    expect(css).toContain('.typography-0 {')
    expect(css).toContain('font-size: 24px;')
    expect(css).not.toContain('/*')
  })

  it('没有 CSS 注释块时原样返回 tsx、css 为空', () => {
    const plain = `export function A() {\n  return <div />\n}\n`
    const { tsx, css } = splitReactCss(plain)
    expect(tsx).toBe(plain)
    expect(css).toBe('')
  })
})

describe('buildProjectFiles · Vue', () => {
  const files = buildProjectFiles('Vue', VUE_EXPORT)!

  it('包含可运行 Vite 工程的关键文件', () => {
    for (const path of [
      'package.json',
      'vite.config.ts',
      'index.html',
      'src/main.ts',
      'src/App.vue',
      'tsconfig.json',
      'README.md',
    ]) {
      expect(files[path], `missing ${path}`).toBeTruthy()
    }
  })

  it('package.json 有 vue + vite 依赖和 dev 脚本', () => {
    const pkg = JSON.parse(files['package.json'])
    expect(pkg.dependencies.vue).toBeTruthy()
    expect(pkg.devDependencies.vite).toBeTruthy()
    expect(pkg.devDependencies['@vitejs/plugin-vue']).toBeTruthy()
    expect(pkg.scripts.dev).toBe('vite')
  })

  it('App.vue 就是导出的 SFC（含 scoped 样式）', () => {
    expect(files['src/App.vue']).toContain('<script setup lang="ts">')
    expect(files['src/App.vue']).toContain('<style scoped>')
  })
})

describe('buildProjectFiles · React', () => {
  const files = buildProjectFiles('React', REACT_EXPORT)!

  it('包含可运行 Vite 工程的关键文件', () => {
    for (const path of [
      'package.json',
      'vite.config.ts',
      'index.html',
      'src/main.tsx',
      'src/App.tsx',
      'src/Component.tsx',
      'src/styles.css',
      'tsconfig.json',
      'README.md',
    ]) {
      expect(files[path], `missing ${path}`).toBeTruthy()
    }
  })

  it('Component.tsx 不含注释块，styles.css 是真实 CSS 文件', () => {
    expect(files['src/Component.tsx']).not.toContain('/* styles.css */')
    expect(files['src/styles.css']).toContain('.typography-0 {')
  })

  it('App.tsx 按实际导出名 import 组件', () => {
    expect(files['src/App.tsx']).toContain("import { Typography } from './Component'")
    expect(files['src/App.tsx']).toContain('<Typography />')
  })
})

describe('buildProjectZip', () => {
  it('产出可解压的 zip，且内容与文件表一致', () => {
    const zipped = buildProjectZip('React', REACT_EXPORT)!
    expect(zipped.byteLength).toBeGreaterThan(0)

    const entries = unzipSync(zipped)
    const names = Object.keys(entries).sort()
    expect(names).toContain('package.json')
    expect(names).toContain('src/Component.tsx')
    expect(names).toContain('src/styles.css')

    const pkg = JSON.parse(strFromU8(entries['package.json']))
    expect(pkg.name).toBe('lutris-export-app')
    expect(strFromU8(entries['src/styles.css'])).toContain('.heading-1 {')
  })

  it('Vue 工程同样可解压', () => {
    const zipped = buildProjectZip('Vue', VUE_EXPORT)!
    const entries = unzipSync(zipped)
    expect(strFromU8(entries['src/App.vue'])).toContain('<style scoped>')
  })

  it('HTML 框架不需要脚手架，返回 null', () => {
    expect(buildProjectFiles('HTML', '<html></html>')).toBeNull()
    expect(buildProjectZip('HTML', '<html></html>')).toBeNull()
  })
})
