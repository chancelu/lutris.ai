# Code Review Fix — Round 2 TODO (2026-03-26)

> Round 1 已 commit (2637c4d): 3 CRITICAL + 11 HIGH 已修，lint 0 error。
> 以下为剩余待修项。

## 🟠 HIGH — 未完成（3项）

- [ ] **H3** ProductDocPanel.vue v-html 接入 DOMPurify 消毒（包已安装）
- [ ] **H13** renderer.ts 共享 Float32Array scratch buffer 加 JSDoc 注释说明必须立即消费
- [ ] **H14** renderer.ts WASM 对象缓存（imageCache/vectorPathCache/fillGeometryCache/strokeGeometryCache/nodePictureCache）加 LRU 淘汰 + `.delete()` 释放

## 🟡 MEDIUM — Security（3项）

- [ ] **M1** use-image-gen.ts Gemini API key 从 URL query string 改为 `x-goog-api-key` header
- [ ] **M2** use-collab.ts Yjs 远程数据加 SceneNode schema 校验再 apply
- [ ] **M3** MCP server.ts `fileRoot` 为 null 时默认 `process.cwd()`，防路径穿越

## 🟡 MEDIUM — Correctness（3项）

- [ ] **M4** use-spec.ts 监听 `activeProjectId` 变化时重新 `syncFromProject()`
- [ ] **M5** figma-api.ts 删除重复的 `weightToStyleName`/`styleNameToWeight`，统一 import fonts.ts
- [ ] **M6** snap.ts 删除重复 `SNAP_THRESHOLD` 常量 + 105-107 行死代码

## 🟡 MEDIUM — Performance（3项）

- [ ] **M7** scene-graph.ts `updateNode` 只在位置属性（x/y/width/height/rotation/parentId）变更时清 `absPosCache`
- [ ] **M8** fonts.ts `isFontLoaded` 改用 `Set<string>` 做 O(1) 查找，去掉 spread
- [ ] **M9** ChatPanel.vue `watch(messages, scrollToBottom, { deep: true })` 改为 `watch(() => messages.value.length, scrollToBottom)`

## 🟡 MEDIUM — Code Quality（3项）

- [ ] **M10** editor.ts（2552行）拆分为 editor-clipboard.ts / editor-export.ts / editor-viewport.ts 等模块
- [ ] **M11** aiModeLabel/aiModeTone 重复逻辑从 ChatPanel + WelcomeOverlay 提取到 useAIChat()
- [ ] **M12** ProductDocPanel.vue 清理 dead refs（showVersions）和 unused import（nextTick）

## 🟢 LOW（8项）

- [ ] **L1** color.ts `colorToFill` 修复 alpha 双重应用（color.a 和 fill.opacity 同时设了 alpha）
- [ ] **L2** scene-graph.ts `generateId` 模块级计数器改为实例级，防多实例 ID 碰撞
- [ ] **L3** tools.ts `generate_image` 的 `setInterval` 加 `try/finally` 确保 `clearInterval`
- [ ] **L4** use-collab.ts zoom `watch()` 存 stop handle，`disconnect()` 时调用
- [ ] **L5** WelcomeOverlay.vue 去掉 500ms `setInterval` polling，修 reactivity 根因
- [ ] **L6** EditorView.vue `document.querySelector('input[type=file]')` 改为专用 ref input
- [ ] **L7** ProductDocPanel.vue emoji 按钮标签换 `<icon-lucide-*>` 组件
- [ ] **L8** use-chat.ts `ENV_API_TYPE` 条件从 `!== 'completions'` 对齐为 `!== ''`

## 📊 Duplication（3项）

- [ ] 提取 geometry.ts / snap.ts 共享 bounds 计算函数
- [ ] 合并 fonts.ts 重复的 font loading 分支
- [ ] 提取 fig-export.ts / clipboard.ts 共享节点序列化逻辑
