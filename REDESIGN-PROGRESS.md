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

## Phase 3: 布局重构 ✅ 完成（16:07）

- AI Panel 从右侧移到左侧（主交互区）
- 新建 TopBar.vue（极简顶栏：logo + 项目名 + Export + UserMenu）
- ContextDrawer 在右侧按需弹出（选中元素时出现）
- 新三栏布局：TopBar | AI Panel (left) | Canvas (center) | ContextDrawer (right, on-demand)

---

## Phase 4: 体验打磨 ✅ 完成（16:51）

- AI 生成时画布顶部显示 accent 色脉冲动画
- ContextDrawer "Modify with AI" 按钮自动填充选中元素上下文到 AI Chat
- WelcomeOverlay → AI Panel 自动聚焦 chat input
- TopBar Export 按钮联动 PropertiesPanel inline export 面板
- ContextDrawer 滑入/滑出过渡动画（150ms）
- PropertiesPanel inline 面板切换 fade 动画（100ms）
- AI 生成失败显示 Retry 按钮
- .fig 导入失败显示 toast

---

## 最终成果汇总

| 指标 | 改前 | 改后 | 变化 |
|------|------|------|------|
| 组件数 | 54 | 34 | -37% |
| 总代码量 | 900KB | ~570KB | -37% |
| 文件数 | 142 | ~110 | -23% |
| EditorView | 16KB | 6.8KB | -57% |
| Toolbar | 14KB | 1KB | -93% |
| 最大组件 | 24KB | 9.2KB | -62% |
| Build 时间 | ~14s | ~12.6s | -10% |
| 主 bundle | 1548KB | 1456KB | -6% |

## Git Commits
```
b83179c Phase 1 partial: delete 17 components + 12 composables, -6056 lines
584550a Phase 1 round 2: EditorView 16KB->6.8KB, Toolbar 14KB->1KB, PropertiesPanel simplified
23c11fa Phase 1 round 3: deep cut - AssetsPanel deleted, 8 components simplified
0c22891 Phase 2 partial: extract tools.ts, canvas.ts, selection.ts from editor.ts
a722e5a Phase 3: layout restructure - AI Panel moved to left, TopBar added
2e4b85b Phase 4: UX polish - loading states, AI flow, transitions, export wiring
```

---

## Phase 5: 测试 + 修复 + 部署 ✅ 完成

### 测试清理（commit `c554d07`）
- 删除过时测试：variables-dialog.spec.ts, code-review.test.ts, roles.test.ts
- 修复 E2E specs：toolbar.spec.ts, panels.spec.ts, chat-panel.spec.ts
- 新增：ai-flow.spec.ts, redesign-layout.spec.ts, stores-redesign.test.ts

### Engine 测试修复（commit `45cf067`）
- 修复 9 个 font weight 测试：`weightToStyle(400)` → `"Regular"` not `"Medium"`
- 全部 1212 engine tests 通过

### UI 修复
- 浮动工具栏恢复 6 个主工具 + flyout 子菜单（commit `4d6bb2f`）
- WelcomeOverlay 不再阻挡画布点击（pointer-events-none/auto 模式）
- Canvas 高度 + toolbar pointer-events 修复（commit `1bfeded`）
- 空格拖拽光标：grab → grabbing → grab 状态机（commit `626cfbe`）

### .fig 拖拽导入（commit `473dc6f`）
- 拖拽 .fig 文件到画布直接导入（方案 B）
- 三种导入方式：拖拽到画布 / WelcomeOverlay 按钮 / File → Open（Ctrl+O）

### 吉祥物 Logo 替换（commit `d4807ea`, `09d9694`）
- 海獭吉祥物替换全部 logo（favicon/PWA/各页面）
- Gemini 3 Pro 修图（去文字 + 修蓝绿色）→ Python PIL 去白底透明
- 所有 logo 引用改为 `h-X w-auto object-contain` 保持原始比例
- 去掉 LoginView bounce 跳动动画

### 部署
- 线上地址：https://lutris-ai.vercel.app
- Build: 2246 modules, main bundle ~1416KB (gzip 422KB)

## Git Commits（Phase 5）
```
c554d07 test: cleanup and fix E2E specs for redesigned layout
45cf067 fix: engine font weight tests
f8ae161 polish: floating toolbar, simplified panels, global transitions
4d6bb2f feat: restore 6 main tools with flyout sub-menus
1bfeded fix: canvas height + toolbar pointer-events
626cfbe fix: space+drag cursor shows grab/grabbing correctly
473dc6f feat: drag-and-drop .fig files onto canvas to import
d4807ea feat: replace all logos with otter mascot, remove bounce animation
09d9694 fix: proper transparent bg for mascot, fix aspect ratios
```

---

_下一步：用户持续测试反馈 → 迭代修复_
