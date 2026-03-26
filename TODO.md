# Code Review Fix — Round 3 TODO (2026-03-26)

> Round 1 (2637c4d): 3 CRITICAL + 11 HIGH ✅
> Round 2 (d2998af): 3 HIGH + 3 MEDIUM ✅
> 以下为剩余待修项。

## 🟡 MEDIUM — Correctness（3项）

- [ ] **M4** use-spec.ts 监听 `activeProjectId` 变化时重新 `syncFromProject()`
- [ ] **M5** figma-api.ts 删除重复的 `weightToStyleName`/`styleNameToWeight`，统一 import fonts.ts
- [ ] **M6** snap.ts 删除重复 `SNAP_THRESHOLD` 常量 + 105-107 行死代码

## 🟡 MEDIUM — Security（1项）

- [ ] **M2** use-collab.ts Yjs 远程数据加 SceneNode schema 校验再 apply

## 🟡 MEDIUM — Performance（2项）

- [ ] **M7** scene-graph.ts `updateNode` 只在位置属性变更时清 `absPosCache`
- [ ] **M8** fonts.ts `isFontLoaded` 改用 `Set<string>` 做 O(1) 查找

## 🟡 MEDIUM — Code Quality（3项）

- [ ] **M10** editor.ts（2552行）拆分为 editor-clipboard.ts / editor-export.ts / editor-viewport.ts 等模块
- [ ] **M11** aiModeLabel/aiModeTone 重复逻辑从 ChatPanel + WelcomeOverlay 提取到 useAIChat()
- [ ] **M12** ProductDocPanel.vue 清理 dead refs（showVersions）和 unused import（nextTick）

## 🟢 LOW（8项）

- [ ] **L1** color.ts `colorToFill` 修复 alpha 双重应用
- [ ] **L2** scene-graph.ts `generateId` 改为实例级计数器
- [ ] **L3** tools.ts `generate_image` setInterval 加 try/finally
- [ ] **L4** use-collab.ts zoom watch 存 stop handle
- [ ] **L5** WelcomeOverlay.vue 去掉 500ms setInterval polling
- [ ] **L6** EditorView.vue file input 改专用 ref
- [ ] **L7** ProductDocPanel.vue emoji 换 Lucide icon
- [ ] **L8** use-chat.ts ENV_API_TYPE 条件对齐

## 📊 Duplication（3项）

- [ ] 提取 geometry.ts / snap.ts 共享 bounds 计算
- [ ] 合并 fonts.ts 重复 font loading 分支
- [ ] 提取 fig-export.ts / clipboard.ts 共享序列化逻辑
