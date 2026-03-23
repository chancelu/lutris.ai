# Lutris.ai R7 — UX 体验优化 PRD

> 来源：以 PM/设计师视角完整 review 所有用户可见组件后的问题清单
> 日期：2026-03-15
> 优先级：P0 > P1 > P2

---

## 一、问题总览

| # | 问题 | 分类 | 优先级 | 涉及文件 | 预估工时 |
|---|------|------|--------|---------|---------|
| 1 | App.vue titleTemplate 仍为 "Lutris.ai" | 品牌一致性 | P0 | `src/App.vue` | 1min |
| 2 | AppMenu logo alt 仍为 "Lutris.ai" | 品牌一致性 | P0 | `src/components/AppMenu.vue` | 1min |
| 3 | HandoffPanel codeFormat 含 'Lutris.ai' 选项 | 品牌一致性 | P0 | `src/components/HandoffPanel.vue` | 2min |
| 4 | WelcomeOverlay 声称支持 .fig 导入但实际依赖 Figma MCP | 新用户体验 | P1 | `src/components/WelcomeOverlay.vue` | 5min |
| 5 | ProviderSetup 无推荐 provider 标识 | 新用户体验 | P2 | `src/components/chat/ProviderSelect.vue` | 10min |
| 6 | Gemini API Key 入口藏太深 | 新用户体验 | P1 | `src/components/QuickActions.vue` | 10min |
| 7 | QuickActions 弹窗无点击外部关闭 | 交互问题 | P1 | `src/components/QuickActions.vue` | 10min |
| 8 | ExportPanel 默认 filename 应为文档名 | 交互问题 | P1 | `src/components/ExportPanel.vue` | 3min |
| 9 | ChatPanel Clear 按钮仅 DEV 可见 | 交互问题 | P1 | `src/components/ChatPanel.vue` | 5min |
| 10 | ProductDocPanel 声称支持 .docx 但无解析逻辑 | 功能缺陷 | P0 | `src/components/ProductDocPanel.vue` | 3min |
| 11 | HandoffPanel 多选时 specs 区空白无提示 | 视觉/文案 | P2 | `src/components/HandoffPanel.vue` | 5min |
| 12 | FigmaBridgePanel 快捷键提示未适配 Windows | 视觉/文案 | P2 | `src/components/FigmaBridgePanel.vue` | 5min |

---

## 二、详细需求

### P0 — 必须立即修复（品牌 + 功能缺陷）

#### TODO 1: App.vue 品牌名修正
- **现状**：`useHead({ titleTemplate: (title) => (title ? \`\${title} — Lutris.ai\` : 'Lutris.ai') })`
- **目标**：替换为 `Lutris.ai`
- **文件**：`src/App.vue`
- **验收**：浏览器 tab 标题显示 "Lutris.ai" 或 "xxx — Lutris.ai"

#### TODO 2: AppMenu logo alt 修正
- **现状**：`alt="Lutris.ai"`
- **目标**：`alt="Lutris.ai"`
- **文件**：`src/components/AppMenu.vue`
- **验收**：logo 图片 alt 属性为 "Lutris.ai"

#### TODO 3: HandoffPanel codeFormat 品牌名修正
- **现状**：codeFormat 选项包含 `'Lutris.ai'`，用户可见
- **目标**：改为 `'Lutris.ai'` 或更通用的名称如 `'json'`/`'raw'`
- **文件**：`src/components/HandoffPanel.vue`
- **验收**：Handoff 面板代码格式选项中无 "Lutris.ai" 字样

#### TODO 10: ProductDocPanel 移除虚假 .docx 支持
- **现状**：`accept=".md,.txt,.docx,.doc"` 但 `importFile` 只调用 `file.text()`，docx 是二进制格式会乱码
- **方案**：移除 `.docx,.doc`，仅保留 `.md,.txt`；或添加提示"docx 支持即将推出"
- **推荐**：先移除，避免用户踩坑
- **文件**：`src/components/ProductDocPanel.vue`
- **验收**：文件选择器不再显示 .docx/.doc 选项

---

### P1 — 体验优化（高频使用路径）

#### TODO 4: WelcomeOverlay 导入描述修正
- **现状**：Import File 按钮下方写 ".fig, .svg, .png"
- **问题**：.fig 导入需要先连接 Figma MCP，新用户直接点会失败且无反馈
- **方案A**（推荐）：改为 ".svg, .png, .json"，去掉 .fig
- **方案B**：保留 .fig 但点击后检测 Figma 连接状态，未连接则引导到 FigmaBridge
- **文件**：`src/components/WelcomeOverlay.vue`
- **验收**：新用户不会因为点击 Import 而遇到无反馈的失败

#### TODO 6: AI Image 无 Key 时的引导优化
- **现状**：用户点 AI Image → 发现没 key → 被跳转到 Brand Settings tab → 需要滚到最底部找 Gemini API Key 输入框
- **问题**：路径太长（3 步），且 API Key 藏在 Brand Settings 语义不直觉
- **方案**：在 QuickActions 的 Image Dialog 内直接显示 API Key 输入框（当 key 为空时），一步到位
- **文件**：`src/components/QuickActions.vue`
- **验收**：无 key 时，Image Dialog 内直接出现输入框 + "Get key" 链接，无需跳转

#### TODO 7: QuickActions 弹窗点击外部关闭
- **现状**：Image Dialog 和 Frame Menu 只能通过再次点击按钮关闭
- **问题**：不符合用户对弹窗的心智模型（点击外部应关闭）
- **方案**：添加 `v-click-outside` 或监听 document click 关闭弹窗
- **文件**：`src/components/QuickActions.vue`
- **验收**：点击弹窗外部区域，弹窗自动关闭

#### TODO 8: ExportPanel 默认文件名使用文档名
- **现状**：`const filename = ref('Export')` 硬编码
- **目标**：`const filename = ref(store.state.documentName || 'Export')`
- **文件**：`src/components/ExportPanel.vue`
- **验收**：打开 Export 面板时，filename 自动填充当前文档名

#### TODO 9: ChatPanel Clear 按钮对生产环境可见
- **现状**：`v-if="IS_DEV && messages.length > 0"` 导致生产环境无法清空对话
- **方案**：Clear 按钮始终可见（当有消息时），Copy log 按钮保持 DEV only
- **文件**：`src/components/ChatPanel.vue`
- **验收**：生产环境下，有消息时可见 Clear 按钮

---

### P2 — 锦上添花

#### TODO 5: ProviderSelect 添加推荐标识
- **现状**：所有 provider 平铺展示，新用户不知道选哪个
- **方案**：给 OpenRouter 或 Anthropic 加 "Recommended" tag（类似 model selector 的 tag 机制）
- **文件**：`src/components/chat/ProviderSelect.vue` + `@open-pencil/core` 的 AI_PROVIDERS 定义
- **验收**：Provider 列表中有一个带 "Recommended" 标签的选项

#### TODO 11: HandoffPanel 多选空状态提示
- **现状**：选中多个元素时 specs 区域完全空白
- **方案**：显示提示文案 "Select a single element to view specs"
- **文件**：`src/components/HandoffPanel.vue`
- **验收**：多选时显示引导文案而非空白

#### TODO 12: FigmaBridgePanel 快捷键适配平台
- **现状**：硬编码 "⌘L to copy from Figma"
- **方案**：检测 `navigator.platform`，Windows 显示 "Ctrl+L"，Mac 显示 "⌘L"
- **文件**：`src/components/FigmaBridgePanel.vue`
- **验收**：Windows 用户看到 "Ctrl+L"，Mac 用户看到 "⌘L"

---

## 三、执行计划

| 阶段 | 内容 | TODO | 预估总耗时 |
|------|------|------|-----------|
| Phase 1 | P0 品牌 + 缺陷修复 | #1, #2, #3, #10 | ~7min |
| Phase 2 | P1 体验优化 | #4, #6, #7, #8, #9 | ~33min |
| Phase 3 | P2 锦上添花 | #5, #11, #12 | ~20min |

总计约 1 小时工作量。

---

## 四、验收标准

- [ ] 全站无 "Lutris.ai" 残留（搜索验证）
- [ ] 新用户首次打开 → 能在 3 步内完成第一个设计操作
- [ ] 所有弹窗支持点击外部关闭
- [ ] 导出默认使用文档名
- [ ] 无虚假功能承诺（.docx 等）
- [ ] `npx vite build` 通过
- [ ] 现有测试不回归
