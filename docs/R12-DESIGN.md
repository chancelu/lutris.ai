# R12 "Atelier" — 品牌与体验重做方向

基于对 Lovart / v0 / Bolt / Framer 的浏览器实地调研（截图见 workspace/research/）。

## 调研结论

| 产品 | 可借鉴的语言 |
|---|---|
| Lovart | 暖黑 `#100F09` + 奶油 `#F5F4EF` 近单色；衬线大标题（editorial）；反色 pill CTA；accent 极度克制 |
| Framer | 纯黑 + 紧凑 grotesk；编辑器暗色面板 + 单一蓝色只给主 CTA；右侧 Agent/Style 面板 |
| Bolt | 深色 hero + 大输入框为一号位；starter tiles；import chips |
| v0 | 居中巨型 prompt 输入 + 建议 chips + 模板分类 |

共同点：近黑而非灰、单一克制的 accent、衬线/大字重排版的编辑感、工作产物占据视觉中心、对话驱动。

## Lutris R12 设计语言

- **色彩**：暖黑画布 `#100E0B`、面板 `#171410`、奶油文字 `#F2EDE3`；accent 换成香槟铜 `#C9A254`（atelier 感，替代被否定的灰绿）；亮色主题保持奶油底 + 深铜 `#8A6A28`。CTA 延续反色中性（奶油底黑字），accent 只做指示（当前阶段、激活态、链接、focus）。
- **字体**：新增 `--font-display` 衬线栈（Georgia → Songti/Noto Serif SC），用于品牌字标、欢迎页标题、阶段标题、Spec Studio 标题；正文继续 Inter/system。
- **结构（核心架构改动）**：主区按阶段切换——
  - Idea → 编辑感欢迎页（serif hero + 三个入口）
  - Spec → **Spec Studio**：全幅可编辑需求板（不再是右侧窄栏的只读小卡片）
  - Design → 画布（不再白屏：非设计阶段主区被阶段界面覆盖）
  - Dev → 画布 + 右侧 Code
- **对话连续性**：阶段推进不再自动把右栏切走（聊天不消失）；Code tab 用圆点提示新内容。
- **Spec 可编辑**：页面卡片内联编辑 name/route/purpose/userStory，组件增删改 + role 选择 + repeatable，交互规则增删改；版本历史沿用 useSpec versions；用户可一键「确认 Spec 开始设计」（不再只能等 AI 提交）。
- **错误可诊断**：聊天错误条展示真实原因（provider/状态码），不再只有 "An error occurred."；provider 设置入口不再静默失效。

## 验收

- 真实浏览器走通 idea→spec→design→dev，每阶段主区有内容、无白屏、无死路
- 前后截图对比；vitest / build / e2e 全绿
