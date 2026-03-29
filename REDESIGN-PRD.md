# Lutris.ai Redesign PRD — AI-Native 产品设计协作工具

> 决策时间：2026-03-29 02:33 AM
> 决策人：小北
> 方向：**A — AI-native agent**，不做 Figma 替代

---

## 1. 产品定位（一句话）

**Lutris.ai = PM、设计师、前端的 AI 协作中枢。**
用自然语言驱动 PRD → 设计稿 → 前端代码 的全流程，小团队 3 人就能跑起来。

### 不是什么
- ❌ 不是 Figma 替代（不追求手动矢量编辑的极致体验）
- ❌ 不是纯 AI 图片生成器（不是 Midjourney/DALL-E wrapper）
- ❌ 不是项目管理工具（不做 Jira/Linear）

### 是什么
- ✅ PM 写 PRD → AI 生成设计方向 → 设计师微调 → 前端拿到可用代码
- ✅ 三个角色在同一个界面里工作，AI agent 做中间的脏活
- ✅ 对标 Lovart 的轻盈感：复杂度藏在 AI 后面，界面极简

---

## 2. 目标用户 & 场景

| 角色 | 核心场景 | 在 Lutris 里做什么 |
|------|---------|-------------------|
| PM | 写需求、定方向 | 输入 PRD/描述 → 看到设计方向 → 批注反馈 |
| 设计师 | 出设计稿、调细节 | 在 AI 生成的基础上微调 → 确认视觉方向 |
| 前端 | 拿设计稿写代码 | 查看标注 → 一键导出 React/Vue/Tailwind |

### 核心用户流程（Happy Path）
```
1. PM 输入需求描述（文字/PRD 文件）
2. AI Agent 分析需求 → 生成设计方案（1-3 个方向）
3. 画布展示设计结果，可点击任意元素
4. 用自然语言修改："把这个按钮改成蓝色"、"加一个导航栏"
5. 满意后 → 导出代码 / 分享给团队 review
```

---

## 3. 信息架构重设计

### 现状问题
```
EditorView (God Component, 16KB)
├── 左侧: Layers | Assets | Pages (3 tabs)
├── 中间: Canvas + Toolbar + QuickActions + FloatingInspector + Comments + CollabCursors
├── 右侧: Create | Spec | Ship (3 tabs)
│   ├── Create: ChatPanel + BrandSettings
│   ├── Spec: SpecPanel | RequirementsBoard | ProductDocPanel (3 sub-tabs)
│   └── Ship: ExportPanel + CodePanel + HandoffPanel
└── 顶部: TabBar + UserMenu + AppMenu + ProjectSwitcher
```
问题：层级太深、tab 太多、用户迷路。

### 新架构
```
EditorView (纯 layout shell, <100 行)
├── TopBar: 文档名 + 分享 + 导出 (极简)
├── 左侧: AI Panel (核心交互区)
│   ├── Prompt 输入框 (永远可见)
│   ├── 对话历史 (可折叠)
│   └── 上下文卡片 (选中的元素/PRD 片段)
├── 中间: Canvas (展示 + 轻量编辑)
│   ├── Toolbar (Select/Frame/Text/Hand, 4 个工具)
│   └── 选中元素的 inline 属性面板
└── 右侧: Context Panel (按需弹出, 默认隐藏)
    ├── 选中元素属性 (点击元素时出现)
    ├── 代码预览 (点击 "Code" 时出现)
    └── Spec 摘要 (点击 "Spec" 时出现)
```

### 关键变化
1. **AI Panel 从右侧移到左侧** — 它是主交互，不是辅助
2. **右侧面板默认隐藏** — 只在需要时弹出，不占常驻空间
3. **砍掉 tab 嵌套** — 没有 Create/Spec/Ship 三级切换
4. **Toolbar 从 11 个工具砍到 4 个** — Select/Frame/Text/Hand

---

## 4. 功能取舍清单

### ✅ 保留（核心路径）
| 功能 | 改动 | 理由 |
|------|------|------|
| AI Chat | 升级为主交互，移到左侧 | 核心 |
| Canvas (Skia) | 保留，但定位为"展示+轻量编辑" | 展示 AI 结果 |
| PRD Import | 保留，简化为拖入文件 | PM 入口 |
| Code Export | 保留 Tailwind/React/Vue | 前端出口 |
| .fig Import | 保留 | 兼容现有设计资产 |
| Brand Settings | 简化，合并进 AI 上下文 | AI 生成需要品牌约束 |
| Project Manager | 简化为项目列表 | 基础功能 |
| Undo/Redo | 保留快捷键，砍掉可视化面板 | 基础功能 |
| WelcomeOverlay | 保留，已经很好 | 首次体验 |
| 基础绘图工具 | 只保留 Select/Frame/Text/Hand | 轻量编辑 |
| AI Select | 保留，点击元素→AI修改 | 核心交互 |
| AI Image Gen | 保留 | 视觉资产生成 |
| Design Token Export | 保留 | 前端需要 |
| 暗色/亮色主题 | 保留 | 已做好 |

### ❌ 砍掉（V1 不做）
| 功能 | 理由 |
|------|------|
| WebRTC Collab | 复杂度高，V2 再做。先用"分享链接查看"替代 |
| Comments/CommentPin | 砍掉，用 AI 对话替代反馈 |
| Component Library | AI 直接生成，不需要手动组件库 |
| Template Library | 改为 AI prompt 模板（纯文字） |
| Variables Dialog | 过度工程 |
| Review Panel | 砍掉 |
| Requirements Board | 合并进 Spec 摘要，不单独做看板 |
| Figma MCP Bridge | 只保留 .fig 文件导入，砍掉实时桥接 |
| i18n | 先只做英文 |
| Mobile responsive | 桌面优先 |
| MobileHud / MobileDrawer | 砍掉 |
| CollabCursors | 随 Collab 一起砍 |
| FloatingInspector | 合并进右侧 Context Panel |
| LayerTree 复杂交互 | 简化为平铺列表 |
| AssetsPanel (24KB) | 砍掉独立面板，颜色/字体信息合并进 Brand |
| HandoffPanel (23KB) | 简化为"选中元素→看 CSS" |
| VariablesDialog (19KB) | 砍掉 |
| FillPicker (18KB) | 简化，AI 生成的设计不需要手动调色 |
| ProductDocPanel (14KB) | 简化为纯 markdown 展示 |
| NodeContextMenu 复杂选项 | 精简到 5 个以内 |

### 🔄 降级（简化但保留）
| 功能 | 从 | 到 |
|------|----|----|
| Properties Panel | 11 个 section 的完整属性编辑器 | 选中元素的只读属性 + "用 AI 修改" 按钮 |
| Toolbar | 11 个工具 + flyout | 4 个工具，一行排列 |
| Layers Panel | 可拖拽排序的树形结构 | 简单的平铺列表 |
| Export | 多格式 + Handoff + Code 三合一 | 一个 Export 按钮 + 格式选择 |
| Spec | Summary + Requirements + Versions 三 tab | 一个 markdown 面板 |

---

## 5. 技术重构计划

### 5.1 Store 拆分（editor.ts 60KB → 5 个文件）

```
stores/
├── canvas.ts        — 画布状态: pan/zoom/viewport/pageColor
├── tools.ts         — 工具选择: activeTool/cursor
├── selection.ts     — 选中状态: selectedIds/hoveredNodeId
├── document.ts      — 文件: graph/undo/autosave/IDB
└── ai.ts            — AI 状态: chat/aiSelect/aiProgress
```

每个 store 独立，通过 composable 组合使用。editor.ts 变成一个 thin facade：
```ts
// stores/editor.ts — 只做 re-export
export { useCanvasStore } from './canvas'
export { useToolStore } from './tools'
export { useSelectionStore } from './selection'
export { useDocumentStore } from './document'
export { useAIStore } from './ai'
```

### 5.2 组件精简（54 → ~20）

#### 删除的组件（~20 个）
```
CollabPanel.vue, CollabCursors.vue          — Collab 砍掉
CommentThread.vue, CommentPin.vue           — Comments 砍掉
VariablesDialog.vue                         — 砍掉
ReviewPanel.vue                             — 砍掉
RequirementsBoard.vue, RequirementLinkMenu  — 合并进 Spec
MobileHud.vue, MobileDrawer.vue             — 砍掉
ComponentLibrary.vue                        — 砍掉
TemplateLibrary.vue                         — 改为 prompt 模板
FigmaBridgePanel.vue                        — 砍掉实时桥接
FloatingInspector.vue                       — 合并进 Context Panel
ViewportSwitcher.vue                        — 砍掉
LocaleSwitcher.vue                          — 砍掉 i18n
```

#### 简化的组件（~10 个）
```
AssetsPanel.vue (24KB)     → 砍掉，品牌信息进 BrandSettings
HandoffPanel.vue (23KB)    → 简化为 <InlineCSS /> (~2KB)
FillPicker.vue (18KB)      → 简化为基础颜色选择 (~4KB)
ProductDocPanel.vue (14KB) → 简化为 markdown 渲染 (~3KB)
Toolbar.vue (14KB)         → 4 个按钮 (~2KB)
LayerTree.vue (14KB)       → 平铺列表 (~4KB)
AppMenu.vue (12KB)         → 精简菜单项 (~4KB)
NodeContextMenu (11KB)     → 5 个选项 (~2KB)
```

#### 新增的组件（~3 个）
```
AIPanel.vue          — 左侧 AI 主面板（prompt + 对话 + 上下文）
ContextDrawer.vue    — 右侧按需弹出面板
ExportDialog.vue     — 导出弹窗（替代 ExportPanel + CodePanel + HandoffPanel）
```

### 5.3 Composables 精简（32 → ~18）

#### 删除
```
use-collab.ts (18KB)       — Collab 砍掉
use-i18n.ts (16KB)         — i18n 砍掉
use-figma-mcp.ts (10KB)    — MCP 桥接砍掉
use-comments.ts            — Comments 砍掉
use-requirements.ts        — 合并进 use-spec
use-roles.ts               — 砍掉
use-code-review.ts         — 砍掉
use-component-drag.ts      — 砍掉
use-versions.ts            — 简化
use-inline-rename.ts       — 砍掉
use-font-status.ts         — 砍掉
use-online-status.ts       — 砍掉
```

#### 保留
```
use-canvas.ts, use-canvas-input.ts  — 画布核心
use-chat.ts                         — AI 对话核心
use-ai-select.ts                    — AI 选择核心
use-image-gen.ts                    — 图片生成
use-spec.ts                         — Spec 管理
use-projects.ts                     — 项目管理
use-keyboard.ts                     — 快捷键
use-text-edit.ts                    — 文本编辑
use-brand.ts                        — 品牌设置
use-theme.ts                        — 主题
use-canvas-drop.ts                  — 拖放
use-menu.ts                         — 菜单
use-toast.ts                        — 提示
use-auth.ts                         — 认证
use-node-props.ts                   — 节点属性
use-multi-props.ts                  — 多选属性
use-asset-library.ts                — .fig 导入
use-templates.ts                    — 改为 prompt 模板
```

### 5.4 EditorView 重构

从 16KB God Component → <3KB layout shell：

```vue
<template>
  <div class="flex h-screen w-screen overflow-hidden">
    <!-- Top bar -->
    <TopBar />
    
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: AI Panel (核心) -->
      <AIPanel class="w-[360px] shrink-0" />
      
      <!-- Center: Canvas -->
      <div class="relative flex-1">
        <EditorCanvas />
        <Toolbar />
        <WelcomeOverlay />
      </div>
      
      <!-- Right: Context (按需) -->
      <ContextDrawer v-if="showContext" />
    </div>
  </div>
</template>
```

---

## 6. 新的交互设计

### 6.1 首次体验
1. Landing Page → "Open Editor"
2. 进入编辑器 → WelcomeOverlay（已有，保留）
3. 点击 "Describe the interface you want…" → 左侧 AI Panel 获得焦点
4. 输入描述 → AI 生成 → 画布展示结果
5. 用户看到设计，开始微调

### 6.2 AI 交互模式
- **Prompt 模式**：在左侧输入框描述需求，AI 生成/修改设计
- **Select 模式**：点击画布元素 → 左侧显示上下文 → 输入修改指令
- **Import 模式**：拖入 .fig 或 PRD → AI 分析 → 展示在画布上

### 6.3 导出流程
- 点击右上角 "Export" 按钮
- 弹出 ExportDialog：
  - 图片：PNG / SVG
  - 代码：React / Vue / Tailwind CSS
  - 标注：CSS 属性摘要
  - Spec：Markdown PRD
- 一键复制或下载

### 6.4 协作（V1 简化版）
- 分享链接 → 只读查看
- 评论 → 通过 AI 对话替代（"我觉得这个按钮太小了" → AI 记录反馈）
- 实时协作 → V2

---

## 7. 执行计划

### Phase 1: 瘦身（3-4 天）
目标：删代码，让项目能跑、能 build、bug 减少

1. 物理删除砍掉的组件和 composables
2. 清理 EditorView 中对已删组件的引用
3. 简化 Toolbar（11 → 4 工具）
4. 确保 build 通过、核心路径可用

### Phase 2: 重构 Store（2-3 天）
目标：editor.ts 60KB 拆成 5 个文件

1. 抽取 canvas store
2. 抽取 selection store
3. 抽取 document store
4. 抽取 tool store
5. 原 editor.ts 变成 facade

### Phase 3: 布局重构（2-3 天）
目标：新的三栏布局，AI Panel 在左

1. 新建 AIPanel.vue（整合 ChatPanel + AIContextCards + ProviderSetup）
2. 新建 ContextDrawer.vue（整合属性面板 + 代码预览）
3. 重写 EditorView.vue（<3KB）
4. 新建 TopBar.vue（替代 TabBar + UserMenu + AppMenu）
5. 新建 ExportDialog.vue

### Phase 4: 体验打磨（2-3 天）
目标：让核心路径丝滑

1. AI 生成结果的 loading 动画
2. 元素选中 → AI 修改的流畅度
3. 导出流程一键化
4. WelcomeOverlay → AI Panel 的衔接
5. 错误处理和 edge case

### 总计：~10-13 天

---

## 8. 成功标准

| 指标 | 目标 |
|------|------|
| 代码量 | 从 900KB 降到 <400KB |
| 组件数 | 从 54 降到 <25 |
| 首次可用时间 | 打开 → 输入 prompt → 看到设计 < 30 秒 |
| 核心路径 bug | 0 个阻塞性 bug |
| Build 时间 | < 15 秒 |
| 主 bundle 大小 | < 1.5MB (gzip) |

---

## 9. 风险 & 缓解

| 风险 | 缓解 |
|------|------|
| 砍功能后用户（你）觉得太简陋 | 先砍再加，比堆了砍容易 |
| Store 拆分引入 regression | 每拆一个跑一次 build + 核心路径测试 |
| AI 生成质量不够 | 这是内容问题不是架构问题，架构先对 |
| 画布交互变差 | 画布核心代码不动，只砍 UI 层 |

---

_这个文档是 Lutris.ai 重构的唯一 source of truth。所有 cc 任务都基于此文档执行。_
_小北确认后开始 Phase 1。_
