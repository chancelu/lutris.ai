# Code Review Fix Checklist (2026-03-26)

> 基于 CODE-REVIEW.md，按优先级排列。cc 逐项修复，每完成一项打 ✅。
> lint check: 0 warnings, 0 errors ✅

## 🔴 CRITICAL — 部署前必修

- [x] **C1** 清理 .env.production/.env.local 中的明文 key，替换为 placeholder，.gitignore 加入 .env.local ✅
- [x] **C2** render-jsx.ts 的 `new Function()` 加 shadow 危险全局变量 ✅
- [x] **C3** constants.ts 中硬编码的 Google Fonts API key 改为 `import.meta.env` 读取 ✅

## 🟠 HIGH — Security

- [x] **H1** use-figma-mcp.ts postMessage handler 加 origin 校验 ✅
- [x] **H2** use-collab.ts P2P 房间标注安全风险文档 ✅
- [ ] **H3** ProductDocPanel.vue 的 v-html 加 DOMPurify 消毒（DOMPurify 已安装，未接入）
- [x] **H4** use-chat.ts / tabs.ts 的 debug window hook 包 `if (import.meta.env.DEV)` ✅
- [x] **H5** bridge.ts CORS 限制为 localhost origin ✅

## 🟠 HIGH — Correctness

- [x] **H6** use-chat.ts 导出 `draftMessage`（修复 prefill 流程）✅
- [x] **H7** 所有 `activeTab.value = 'ai'` 改为有效值 `'create'` ✅
- [x] **H8** fonts.ts `weightToStyle` 修复 400→Regular 映射 ✅
- [x] **H9** undo.ts `createPropertyChange` 改用 `graph.updateNode()` 替代 `Object.assign` ✅
- [x] **H10** scene-graph.ts `reorderChild` 修复 same-parent off-by-one ✅
- [x] **H11** use-chat.ts 的 `require()` 已移除/重构 ✅
- [x] **H12** clipboard.ts `componentId: ''` 改为 `null` ✅

## 🟠 HIGH — Performance

- [ ] **H13** renderer.ts 共享 Float32Array 加文档注释或改为 per-call 分配
- [ ] **H14** renderer.ts WASM 对象缓存加 LRU 淘汰 + `.delete()` 释放

## 🟡 MEDIUM — Security

- [ ] **M1** use-image-gen.ts API key 从 URL query 改为 header
- [ ] **M2** use-collab.ts Yjs 远程数据加 schema 校验
- [ ] **M3** MCP server.ts fileRoot 为 null 时默认 cwd，防路径穿越

## 🟡 MEDIUM — Correctness

- [ ] **M4** use-spec.ts 监听 activeProjectId 变化重新 sync
- [ ] **M5** figma-api.ts 删除重复的 weight↔style 转换，统一用 fonts.ts
- [ ] **M6** snap.ts 删除重复常量 + 死代码

## 🟡 MEDIUM — Performance

- [ ] **M7** scene-graph.ts updateNode 只在位置属性变更时清 absPosCache
- [ ] **M8** fonts.ts isFontLoaded 改用 Set 做 O(1) 查找
- [ ] **M9** ChatPanel.vue deep watcher 改为 watch messages.length

## 🟡 MEDIUM — Code Quality

- [ ] **M10** editor.ts 拆分（clipboard/export/viewport 等模块）
- [ ] **M11** aiModeLabel/aiModeTone 逻辑提取到 useAIChat()
- [ ] **M12** ProductDocPanel.vue 清理 dead refs 和 unused import

## 🟢 LOW（后续处理）

- [ ] **L1** color.ts colorToFill 修复 alpha 双重应用
- [ ] **L2** scene-graph.ts generateId 改为实例级计数器
- [ ] **L3** tools.ts generate_image setInterval 加 try/finally
- [ ] **L4** use-collab.ts zoom watch 存 stop handle
- [ ] **L5** WelcomeOverlay.vue 去掉 polling interval，修根因
- [ ] **L6** EditorView.vue 文件输入改专用 input 元素
- [ ] **L7** ProductDocPanel.vue emoji 换 Lucide icon
- [ ] **L8** use-chat.ts ENV_API_TYPE 条件对齐

## 📊 Duplication（后续处理）

- [ ] 提取 geometry/snap 共享 bounds 计算
- [ ] 提取 fonts.ts 重复的 loading 分支
- [ ] 提取 fig-export/clipboard 共享序列化逻辑
