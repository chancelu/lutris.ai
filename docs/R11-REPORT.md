# R11 报告 — "Warm Craft" 设计系统与 UI/UX 全方位升级（2026-07-20）

> 分支：`agent/r10-ux`（改动未提交，留在工作区）。
> 设计规范：`docs/R11-DESIGN-SYSTEM.md`。截图：`workspace/r11-acceptance/`。

## 目标

参考 Lovart 的高级、克制、专业的设计语言，统一设计系统，提升产品调性，
把 idea → spec → 设计稿 → dev 的工作流体验打磨到世界级。

## 核心问题（review 结论）

1. **品牌人格分裂**：加载屏和亮色主题是"暖奶油 + 深桉绿"（#3B7A6B），
   暗色主题（默认）却是中性灰 + 科技蓝（#5b9cf6）——两个产品。
2. **蓝色硬编码散落**：ExportPanel / ProductDocPanel / SpecPanel / ExportSection /
   toast 里 `bg-blue-600`、`text-blue-400`、`border-blue-500` 等 10+ 处。
3. **`bg-accent text-white` 15 处**：主按钮、气泡、tab 全靠彩色大色块，廉价感来源。
4. 无全局 focus 环、无选区色、toast 默认纯蓝块、聊天用户消息是饱和蓝气泡。

## 设计决策

**统一为"暖工艺"（Warm Craft）人格**：暗色 = 暖炭灰 + 桉叶绿（sage #7FBFA1），
与亮色的奶油 + 深绿同一品牌。色彩角色（Lovart 式克制）：

- **主操作 = 反色中性**（`bg-surface text-panel`）：欢迎页 CTA、发送、Connect、导出。
- **accent = 指示而非装饰**：当前阶段、激活 tab、激活工具、链接、focus 环。
- 新增 `on-accent` token 解决 sage 上的文字对比度（白字在浅绿上不达标）。
- 聊天：用户消息 = 安静的中性气泡；AI 消息 = 纯文本无气泡（Lovart/Claude 式）。

## 改动清单（26 文件）

### 设计系统基础
- `src/app.css` — 暗色 token 全面换暖色系；新增 `--color-on-accent`；
  `color-scheme` 按主题声明；`::selection` accent 染色；全局 `:focus-visible`
  accent 环；正文字体渲染优化（antialiased / optimizeLegibility）
- `src/components/ui/button.ts` — accent tone 改 `text-on-accent`；新增 `primary`
  （反色中性）tone；`border-white/10` → `border-border`
- `src/components/ui/toast.ts` — 默认 toast 改反色中性 + 发丝边框（原纯蓝块）

### 核心界面
- `WelcomeOverlay.vue` — CTA 改反色中性 pill；排版升级；入场动效；
  **修复隐性 bug：内容容器改为 pointer-events-none，仅按钮可点**
  （原实现整块不可见区域拦截画布点击，dblclick 文本编辑被挡——e2e 抓出）
- `ChatMessage.vue` — 用户气泡改中性面；AI 消息去气泡；工具卡改 inset 面；消息入场动效
- `ChatInput.vue` — 发送按钮改反色中性；输入框 focus 环收敛
- `ProviderSetup.vue` — Connect 改反色中性主按钮
- `PipelinePhaseStepper.vue` — 步进器加 inset 轨道（分段控件感）
- `NextStepCard.vue` — CTA 改反色中性；卡片改 inset 面 + 入场动效
- `Toolbar.vue` — 激活工具 `text-on-accent`；hover 缩放 110%→105%（克制）
- `CodePanel.vue` — 框架 tab 改分段控件（inset 轨道 + panel 激活面）
- `LeftSidebar.vue` — "Edit with AI" 改 `text-on-accent`

### 一致性清扫（蓝色硬编码清零）
- `ExportPanel.vue`、`properties/ExportSection.vue` — 蓝色主按钮 → 反色中性；选中态 → accent tint
- `ProductDocPanel.vue` — Write/Save → 反色中性；Edit/AI Parse → accent；focus 蓝色 → accent
- `SpecPanel.vue` — Add Page → accent；角色标签 amber → accent tint；卡片圆角/悬停统一
- `ProviderSelect.vue`、`ProviderSettings.vue` — Done 按钮 `text-on-accent`；圆角统一
- `AIContextCards.vue`、`TokenBindButton.vue`、`ProjectSwitcher.vue` — 细节统一
- `LayerTree.vue` — CSS var 兜底色 #3b82f6 → #7FBFA1；选中行 `text-on-accent`
- `TypographySection.vue` — 5 处激活按钮 `text-on-accent`
- `EditorCanvas.vue` — "Send to AI Chat" 按钮 `text-on-accent`；加载图标白色 → muted

### 文档
- `docs/R11-DESIGN-SYSTEM.md` — 设计系统规范（token、色彩角色、动效规则）
- `CHANGELOG.md` — Unreleased 新增 Design 段落
- `scripts/r11-shots.mjs` / `r11-shots-keyless.mjs` — 可复用的视觉验证脚本

## 验证

| 检查 | 结果 |
|---|---|
| `npm run build` | ✅ 通过（含 PWA sw.js） |
| `npx vitest run` | ✅ **1240 pass / 0 fail**（57 文件，9 skip） |
| `npx playwright test --project=lutris` | ✅ **186 pass / 0 fail**（27 skip，与 R10 基线一致） |
| `npm run lint` | 39 errors / 8 warnings —— 与 R10 存量完全一致，零新增 |
| 视觉截图（dark/light × idea/design/spec/dev + 真实 AI 对话） | ✅ `workspace/r11-acceptance/`，零 console 错误 |

### 回归与修复记录

- e2e 曾 3 个失败：2 个（ai-flow / happy-path）实为**孤儿 dev server 占用 1420 端口**
  导致 playwright 复用了带密钥的服务器，环境性失败，清端口后通过。
- `text-formatting` 双击退不出编辑态：**真回归**——欢迎层内容增高后，
  其 pointer-events-auto 盒子覆盖画布双击点。修复为"内容穿透、仅按钮可点"，
  顺带消除了欢迎层在画布上的不可见拦截区（产品体验也更正确）。

## 已知遗留（诚实清单）

- 暗色模式下画布区域仍是纯白页面背景（Skia 渲染的文档背景），与暖炭壳对比强烈。
  改默认页面背景涉及渲染层与像素快照，本轮未动，建议下轮专项评估。
- NextStepCard 仅在已有对话消息时渲染（无消息的跳阶段场景无引导）——R10 既有行为。
- `packages/docs/public/screenshot.png` 仍是旧蓝色 UI 截图。
- lint 存量 39 errors 未动（零新增）。
