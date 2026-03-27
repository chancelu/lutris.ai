# PRD-R9: UI 减重 — 参考 Lovart 的干净交互

> 核心理念：AI-first 设计工具的 UI 应该像 Lovart 一样克制 — 说 → 看 → 改，没有多余面板。
> 原则：Progressive Disclosure（渐进式展示），默认极简，按需展开。
> 参考：docs/lovart-analysis.md（Lovart 编辑器实际截图分析）

---

## Lovart 设计要点（必读）

Lovart 的编辑器是两栏布局：左=无限画布，右=纯 AI 对话。
- 没有左侧面板（没有 Layers/Pages/Assets）
- 没有属性面板（选中元素不弹编辑器，修改通过 AI 对话）
- 顶部只有 logo + 文件名 + 用户头像，中间完全空白
- 工具栏浮在画布底部中央，纯 icon 无文字，约 8 个按钮
- 右侧面板只有一个 AI 对话流 + 底部输入框，没有 tab 切换
- 面板之间几乎没有 border，用微妙阴影分隔
- 大量留白，字号偏小

我们不需要完全复制 Lovart（Lutris 有 Spec 和 Export 功能需要保留），但要学习它的克制感。

---

## 1. 右侧面板重构（最高优先级）

### 现状问题
- Create / Spec / Ship 三个平级 tab，每个又嵌套子 tab
- 每个 tab 顶部有标题 + 描述 + Brand 按钮，信息密度过高
- 用户进来就看到一堆控制面板，不像 AI 工具，像 IDE

### 改动
- [ ] **砍掉 panelTitle / panelDescription**（PropertiesPanel.vue 中的 panelTitle computed 和 panelDescription computed 以及对应的 template 渲染）— 只保留 Create / Spec / Ship 三个 tab 按钮
- [ ] **Create tab 默认态 = 纯 prompt 输入**：Brand 按钮和 ProviderSetup 收到一个 ⚙️ 齿轮图标的下拉菜单里，不在面板顶部外露
- [ ] **Spec / Ship tab 无内容时极简**：只显示一行灰色提示文字 + 一个 CTA 按钮，不要空面板结构占位
- [ ] **Ship 子 tab 精简**：Export 作为主入口直接显示，Code / Handoff 收到底部 "More export options" 折叠区（默认收起）

## 2. 左侧面板减重

### 现状问题
- Project Switcher + Pages + 5 个子 tab（Layers/Assets/Templates/Components/History）
- 对 AI-first 工具来说，首次进入不需要看到这些

### 改动
- [ ] **默认折叠左侧面板**：修改 EditorView.vue 的 SplitterGroup，左侧面板默认 collapsed。显示一个窄条（约 48px 宽），包含 logo 图标 + 展开按钮（chevron-right icon）
- [ ] **展开后精简 tab**：只保留 Layers + Assets 两个主 tab 按钮。Templates / Components / History 收到面板底部的小图标栏（icon-only，hover 显示 tooltip）
- [ ] **Project Switcher 移入 AppMenu**：从 LayersPanel.vue 移除独立的 Project Switcher 区块，改为在 AppMenu 的菜单里添加 "Switch Project" 子菜单

## 3. Toolbar 极简化

### 现状问题
- 所有工具平铺展示，还有 shape 子菜单、clipboard 操作、层级操作

### 改动
- [ ] **默认只显示 5 个核心工具图标**：Select / Frame / Rectangle / Text / Hand（参考 Lovart 的纯 icon 风格，不显示文字标签）
- [ ] **其他工具收到 "+" 按钮的弹出菜单**：Ellipse / Line / Polygon / Star / Pen / Section
- [ ] **移除 Clipboard 操作按钮**（Copy/Paste/Cut/Duplicate）：只保留快捷键
- [ ] **移除层级操作按钮**（Bring to front / Send to back 等）：只在右键菜单保留

## 4. WelcomeOverlay 再精简

### 现状问题
- 标题 + 描述 + AI badge + prompt 按钮 + Import .fig + Import PRD + Blank canvas + 3 个 quick prompts

### 改动
- [ ] **重写为单焦点布局**：
  - 居中一个大标题 "What do you want to make?"（保留）
  - 下面一个大输入框/按钮 "Describe the interface you want..."（点击后跳到右侧 Create tab）
  - 再下面一行小字链接："or import .fig · import PRD · blank canvas"（用 · 分隔，text-muted 颜色）
- [ ] **砍掉 quick prompts 区块**
- [ ] **砍掉 AI status badge**
- [ ] **整个 overlay 卡片改为无边框**：去掉 rounded-[28px] border shadow，改为纯内容浮在半透明背景上

## 5. 全局视觉减重

- [ ] **减少 border**：SplitterResizeHandle 的分割线改为透明（hover 时才显示），面板 border-border 改为 border-border/30
- [ ] **统一圆角为 rounded-xl**（12px）：替换所有 rounded-[28px]、rounded-2xl 等
- [ ] **简化背景层级**：去掉 bg-inset，统一用 bg-panel。hover 态统一用 bg-hover
- [ ] **移除底部常驻工具栏**（EditorView.vue 中的 shortcuts + locale + theme 按钮区）：LocaleSwitcher 和 ThemeSwitcher 移入 AppMenu，ShortcutsPanel 保留 Ctrl+? 快捷键触发

## 6. 不动的部分

- EditorCanvas 核心渲染不动
- AI Chat 对话交互逻辑（useAIChat / ChatPanel 消息流）不动
- Collab / WebRTC 不动
- 路由结构不动
- 测试不动
- LandingPage 不动

---

## 验收标准

1. 首次进入编辑器，视觉上只有：画布 + 右侧 AI prompt + 浮动 toolbar（5 个 icon）
2. 左侧面板默认收起为窄条，点击展开
3. 右侧面板顶部没有描述文字，只有 Create/Spec/Ship tab 按钮
4. WelcomeOverlay 只有标题 + 输入框 + 一行次要链接
5. 面板之间的 border 极淡或不可见
6. `npx vite build` 通过
7. 现有测试不 break
