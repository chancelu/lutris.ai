# Lutris.ai 项目进度总览

> 更新时间：2026-03-16
> 测试状态：1211 pass / 0 fail / 40 skip

---

## 一、主线 Phases（PLAN.md）

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | Core Engine（SceneGraph, Skia, 选择, 缩放, 撤销） | ✅ 完成 |
| Phase 2 | Editor UI + Layout（属性面板, 图层, 工具栏, Yoga, 文本, 钢笔） | ✅ 完成 |
| Phase 3 | File I/O（.fig 导入导出, Kiwi 编解码, PNG/SVG 导出） | ✅ 完成 |
| Phase 4 | Components + Variables（组件/实例, 变量集合, 模式, 颜色绑定） | ✅ 完成 |
| Phase 5 | AI Integration（90+ 工具, 多 provider, streaming, JSX 渲染） | ✅ 完成 |
| Phase 6 | Collaboration（P2P WebRTC + Yjs CRDT, 光标, 在线状态） | ✅ 完成 |
| Phase 7 | Distribution（Tauri 桌面端, Web 部署, CLI, 文档站） | ✅ 完成 |

---

## 二、DesignFlow C1+C2 迭代（本轮完成）

| 任务 | 状态 | 提交 |
|------|------|------|
| C1: Tailwind Config 导出 | ✅ | `c2d74ac` |
| C1.3: 外部 .fig 文件挂载为只读资产库 | ✅ | `78efd0c` |
| C1: Token 绑定 UI（6 个属性面板） | ✅ | `51645ef` |
| C1: 设计系统 diff（snapshot + diff 工具） | ✅ | `033a695` |
| C2: 多格式代码导出（Vue SFC / React / HTML+CSS） | ✅ | `61e2a14` |
| C2: 标注 overlay 完整 UI（测量模式, Alt+hover） | ✅ | `0652bee` |

---

## 三、R7 UX 优化（12 项）

| # | 问题 | 状态 | 备注 |
|---|------|------|------|
| 1 | App.vue titleTemplate 品牌名 | ✅ | 已改为 Lutris.ai |
| 2 | AppMenu logo alt | ✅ | |
| 3 | HandoffPanel codeFormat 品牌名 | ✅ | |
| 4 | WelcomeOverlay .fig 导入描述 | ⚠️ 部分 | 仍显示 "导入 .fig 文件"，未改为 .svg/.png |
| 5 | ProviderSelect 推荐标识 | ✅ | 有 Recommended tag |
| 6 | Gemini API Key 入口优化 | ✅ | Image Dialog 内直接显示 |
| 7 | QuickActions 点击外部关闭 | ❌ 未做 | 无 click-outside 逻辑 |
| 8 | ExportPanel 默认文件名 | ✅ | 使用 documentName |
| 9 | ChatPanel Clear 按钮生产可见 | ✅ | Clear 无 IS_DEV 限制 |
| 10 | ProductDocPanel 移除 .docx | ✅ | 仅保留 .md,.txt |
| 11 | HandoffPanel 多选空状态提示 | ✅ | |
| 12 | FigmaBridge 快捷键适配平台 | ✅ | navigator.platform 检测 |

---

## 四、R8 产品体验 + 技术债

| # | 问题 | 优先级 | 状态 | 备注 |
|---|------|--------|------|------|
| 1 | AI Chat Streaming 进度反馈 | P1 | ✅ | progressLabel 已实现 |
| 2 | 多页面支持 | P2 | ❌ 未做 | LayersPanel 无 page tabs |
| 3 | 历史版本 Visual Diff | P2 | ❌ 未做 | UndoHistoryPanel 无高亮 |
| 4 | PWA 离线体验验证 | P2 | ⚠️ 未验证 | VitePWA 已配置但未测试 |
| 5 | 测试 fail 修复 | P1 | ✅ | 0 fail |
| 6 | bun build 修复 | P0 | ❌ 仍失败 | vite-plugin-pwa buildEnd 报错 |
| 7 | Playwright e2e 隔离 | P0 | ✅ | bunfig.toml exclude 已配置 |
| 8 | lint warnings 清理 | P3 | ⚠️ 部分 | 29 warnings + 70 errors |

---

## 五、构建状态

| 检查项 | 状态 |
|--------|------|
| `bun test ./tests/engine` | ✅ 1211 pass / 0 fail |
| `bun run build` | ❌ vite-plugin-pwa buildEnd 报错 |
| `bun run lint` | ❌ 29 warnings + 70 errors |
