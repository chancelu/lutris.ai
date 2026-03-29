# Lutris.ai Redesign — Phase 1 TODO (瘦身)

> 基于 REDESIGN-PRD.md 执行。每完成一步跑 `npx vite build` 确认不挂。
> 原则：先删后改，每删一批就 build 一次。

---

## Step 1: 删除砍掉的组件 & composables

### 1.1 删除组件文件
```
src/components/CollabPanel.vue
src/components/CollabCursors.vue
src/components/CommentThread.vue
src/components/CommentPin.vue
src/components/VariablesDialog.vue
src/components/ReviewPanel.vue
src/components/RequirementsBoard.vue
src/components/RequirementLinkMenu.vue
src/components/MobileHud.vue
src/components/MobileDrawer.vue
src/components/ComponentLibrary.vue
src/components/TemplateLibrary.vue
src/components/FigmaBridgePanel.vue
src/components/FloatingInspector.vue
src/components/ViewportSwitcher.vue
src/components/LocaleSwitcher.vue
src/components/TabBar.vue
```

### 1.2 删除 composables 文件
```
src/composables/use-collab.ts
src/composables/use-i18n.ts
src/composables/use-figma-mcp.ts
src/composables/use-comments.ts
src/composables/use-requirements.ts
src/composables/use-roles.ts
src/composables/use-code-review.ts
src/composables/use-component-drag.ts
src/composables/use-versions.ts
src/composables/use-inline-rename.ts
src/composables/use-font-status.ts
src/composables/use-online-status.ts
```

### 1.3 清理所有 import 引用
- 在整个 `src/` 目录中搜索上述已删文件的 import 语句
- 删除或替换所有引用
- 对于 `use-i18n` 的 `t()` 调用，全部替换为硬编码英文字符串
- 对于 `use-collab` 的 `provide(COLLAB_KEY, ...)` 和 `useCollabInjected()`，移除
- 对于 `use-comments` 的 `useComments()`，移除相关逻辑
- 对于 `use-online-status` 的 `isOnline`，移除离线 banner

### 1.4 Build 检查
```bash
npx vite build
```
必须 exit 0。

---

## Step 2: 简化 EditorView.vue

### 2.1 移除已砍功能的模板代码
- 移除 CollabPanel 相关模板和逻辑
- 移除 MobileHud / MobileDrawer 分支（整个 `v-if="isMobile"` 分支）
- 移除 TabBar
- 移除 collab 相关的 provide/inject、onShare/onJoin/onDisconnect
- 移除 SafariBanner（低优先级兼容）
- 移除 FloatingInspector
- 移除 importNextSteps / NextStepCard 逻辑

### 2.2 简化后的 EditorView 结构
```vue
<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <!-- Top bar: 简化 -->
    <header class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-4">
      <div class="flex items-center gap-2">
        <img src="/favicon-32.png" class="size-5" alt="Lutris.ai" />
        <span class="text-sm font-medium text-surface">{{ store.state.documentName }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: AI Panel -->
      <PropertiesPanel class="w-[360px] shrink-0 border-r border-border" />

      <!-- Center: Canvas -->
      <div class="relative flex min-w-0 flex-1 flex-col">
        <EditorCanvas />
        <Toolbar />
        <WelcomeOverlay @action="onWelcomeAction" />
      </div>

      <!-- Right: Design properties (按需) -->
      <aside v-if="showDesignPanel" class="w-[280px] shrink-0 border-l border-border">
        <DesignPanel />
      </aside>
    </div>
  </div>
</template>
```

### 2.3 Build 检查
```bash
npx vite build
```

---

## Step 3: 简化 Toolbar

### 3.1 Toolbar.vue 改造
- 只保留 4 个工具按钮：SELECT / FRAME / TEXT / HAND
- 删除 OVERFLOW_TOOLS dropdown（SECTION/ELLIPSE/LINE/POLYGON/STAR/PEN）
- 删除 mobile toolbar 整个分支
- 删除 ActionItem / onActionTap / slideVariants 等移动端逻辑
- 删除 AI Select 按钮（AI Select 改为从左侧 AI Panel 触发）

### 3.2 stores/editor.ts 中的 TOOLS 常量
```ts
export const TOOLS: ToolDef[] = [
  { key: 'SELECT', label: 'Move', shortcut: 'V' },
  { key: 'FRAME', label: 'Frame', shortcut: 'F' },
  { key: 'TEXT', label: 'Text', shortcut: 'T' },
  { key: 'HAND', label: 'Hand', shortcut: 'H' }
]
export const OVERFLOW_TOOLS: ToolDef[] = [] // 清空
```

### 3.3 Build 检查

---

## Step 4: 简化右侧面板

### 4.1 PropertiesPanel.vue 改造为 AI Panel
- 当前 PropertiesPanel 有 Create/Spec/Ship 三个 tab
- 改造为：AI 对话为主，底部有 Spec/Export 快捷入口
- 移除 BrandSettings 的内嵌展示（改为独立设置页或 AI 上下文）
- 移除 Ship tab 下的 CodePanel + HandoffPanel 内嵌
- 保留 ChatPanel 作为核心
- 保留 ExportPanel 作为独立弹窗触发

### 4.2 新建 ContextDrawer.vue
- 当用户选中画布元素时，右侧弹出属性面板
- 内容：DesignPanel（已有，保留位置/外观/填充/描边）
- 底部加一个 "Modify with AI" 按钮，点击后焦点跳到左侧 AI Panel
- 未选中时隐藏

### 4.3 Build 检查

---

## Step 5: 清理残留

### 5.1 删除未使用的 properties 子组件（如果不再被引用）
- 检查 `src/components/properties/` 下哪些还被 DesignPanel 使用
- 未使用的删除

### 5.2 删除 demo.ts 中对已删组件的引用（如有）

### 5.3 清理 use-keyboard.ts 中对已删功能的快捷键绑定

### 5.4 最终 Build + 手动验证核心路径
```bash
npx vite build
```

核心路径验证：
1. 打开 /editor → 看到 WelcomeOverlay
2. 点击 "Describe..." → AI Panel 获得焦点
3. 输入 prompt → AI 生成设计（如果 provider 已配置）
4. 点击画布元素 → 右侧显示属性
5. 点击 Export → 能导出

---

## 完成标准

- [ ] `npx vite build` exit 0
- [ ] 组件数从 54 降到 ≤ 30
- [ ] EditorView.vue < 5KB
- [ ] 无 console error（dev 模式下）
- [ ] 核心路径可走通（prompt → canvas → export）
