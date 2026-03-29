# Lutris.ai Redesign — 进度记录

> 开始时间：2026-03-29 02:33 AM
> 方向：AI-native agent，不做 Figma 替代

---

## Phase 1: 瘦身 ✅ 完成（3 轮 cc）

### Round 1（03:08）
- 删除 17 个组件 + 12 个 composables
- -6056 行代码
- 被 kill（超时），但工作已完成

### Round 2（11:55）
- EditorView 16KB → 6.8KB
- Toolbar 14KB → 1KB（只剩 4 个工具）
- PropertiesPanel 简化为纯 AI Chat 面板
- 新建 ProjectSwitcher.vue

### Round 3（13:05）
- 删除 AssetsPanel（24KB）、QuickActions、ShortcutsPanel、UndoHistoryPanel、PagesPanel、SafariBanner
- 简化 HandoffPanel 23KB→3.5KB、FillPicker 18KB→精简、AppMenu 11KB→3.4KB 等 8 个组件
- -3700 行代码

### Phase 1 总成果
| 指标 | 改前 | 改后 | 变化 |
|------|------|------|------|
| 组件数 | 54 | 33 | -39% |
| 总代码量 | 900KB | 567KB | -37% |
| 文件数 | 142 | 109 | -23% |
| EditorView | 16KB | 6.8KB | -57% |
| Toolbar | 14KB | 1KB | -93% |
| 最大组件 | 24KB | 9.2KB | -62% |
| 主 bundle | 1548KB | 1452KB | -6% |

### 删除的组件（21 个）
CollabPanel, CollabCursors, CommentThread, CommentPin, VariablesDialog, ReviewPanel, RequirementsBoard, RequirementLinkMenu, MobileHud, MobileDrawer, ComponentLibrary, TemplateLibrary, FigmaBridgePanel, FloatingInspector, ViewportSwitcher, LocaleSwitcher, TabBar, AssetsPanel, QuickActions, ShortcutsPanel, UndoHistoryPanel, PagesPanel, SafariBanner

### 删除的 composables（12 个）
use-collab, use-i18n, use-figma-mcp, use-comments, use-requirements, use-roles, use-code-review, use-component-drag, use-versions, use-inline-rename, use-font-status, use-online-status

---

## Phase 2: Store 拆分 🟡 部分完成（1 轮 cc）

### 完成
- 抽出 tools.ts（0.8KB）— Tool 类型 + TOOLS 常量 + activeTool
- 抽出 canvas.ts（3.3KB）— pan/zoom/viewport（合并了 editor-viewport.ts）
- 抽出 selection.ts（1.8KB）— selectedIds/hoveredNodeId/marquee
- Facade 模式：useEditorStore() API 不变，组件无感

### 未完成
- editor.ts 仍 58KB（只减了 2KB）
- 节点操作、渲染、字体加载、文件 I/O 等核心逻辑未拆出
- 原因：createEditorStore() 内部耦合严重，安全拆分需要更多时间

### Store 文件现状
```
editor.ts            58KB  ← 仍然是 God Store
editor-clipboard.ts   9.7KB
autosave-idb.ts       7.4KB
editor-export.ts      6.6KB
canvas.ts             3.3KB  ← 新
tabs.ts               3.1KB
editor-types.ts       2.3KB
selection.ts          1.8KB  ← 新
tools.ts              0.8KB  ← 新
```

---

## Phase 3: 布局重构 ⏳ 进行中

### 目标
- AI Panel 从右侧移到左侧（主交互区）
- 右侧面板默认隐藏，选中元素时弹出
- 新的三栏布局：AI Panel | Canvas | Context Drawer
- 顶部极简 TopBar

---

## Git Commits
```
b83179c Phase 1 partial: delete 17 components + 12 composables, -6056 lines
584550a Phase 1 round 2: EditorView 16KB->6.8KB, Toolbar 14KB->1KB, PropertiesPanel simplified
23c11fa Phase 1 round 3: deep cut - AssetsPanel deleted, 8 components simplified, 33 components / 567KB total
0c22891 Phase 2 partial: extract tools.ts, canvas.ts, selection.ts from editor.ts (facade pattern)
```

---

_下一步：Phase 3 布局重构 → Phase 4 体验打磨_
