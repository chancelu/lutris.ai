# R10 验收报告 — Lutris.ai UX 重构（2026-07-17）

> 分支：`agent/r10-ux`（基于 `main@6ce90a1`），8 个提交。
> 规格文档：`docs/R10-UX-OVERHAUL.md`。验收截图：工作区 `r10-acceptance/`。

## 结果指标

| 指标 | R10 前 | R10 后 |
|---|---|---|
| 编辑器启动 | ❌ 每次进入即崩溃（`pendingConflict is not defined`） | ✅ 零 console 错误 |
| 单元测试 | 仅 23 个可跑（bun 独占 1211 个） | ✅ **1239 pass / 0 fail**（57 文件，bun→vitest 迁移） |
| E2E | 无法运行（启动即崩） | ✅ **186 pass / 0 fail**（27 skip 均为环境性/有意跳过） |
| 生产构建 | ❌ PWA buildEnd 报错 | ✅ `pnpm run build` 通过（sw.js 生成） |
| Lint | 39 errors / 9 warnings | 39 errors / 8 warnings（零新增） |

## 核心修复（产品从"打不开"到"走得完"）

1. **P0 启动崩溃**：`use-product-doc.ts` 悬空引用导致每次进编辑器即白屏报错。已清理（该死代码是 pendingSyncConfirm 模型的过期副本，零消费方）。
2. **跨阶段数据流接通**：Idea 摘要注入 Spec/Design 提示词；Spec 页面（含真实 ID）注入 Design 提示词 + 新增 `get_spec_pages` 只读工具；`submit_spec_output` 返回页面 ID，Design 的 `pageNodeMap` 不再是空泛契约。
3. **无 API Key 死局解锁**：新增 `skipToDesign()`（idea/spec 标记 skipped），欢迎页与 ProviderSetup 都有 "Start from a blank canvas" 出口；此前无 key 用户在 Idea 阶段彻底卡死。
4. **Dev 阶段长出 UI**：挂载 orphaned `CodePanel.vue`，`export_code` 结果通过监听器进入新 `code-output` store——框架 tab（Vue/React）、文件列表、Prism 高亮、复制/下载。此前导出代码只以文本掉在聊天里。
5. **死路清理**：登出导航到不存在的 `/login` → 改为原地登出+toast；ExportPanel 两个空调用按钮移除；无 UI 的隐形多标签快捷键（Ctrl+T/N/W）移除；"Analyze imported design" 仅在 design/dev 显示。
6. **孤儿组件**：删除 6 个零引用组件；4 个属性 Section（Layout/Typography/Stroke/Effects）+ FontPicker 挂载进 DesignPanel（Figma 顺序）。

## UX 重构（Lovart 式克制 + 水獭引导）

- **欢迎页**：无边框浮层 = 挥手水獭 + "What do you want to build?" + 单主按钮 + 一行次要链接（Import PRD · blank canvas）。
- **TopBar**：水獭 icon + 单个可编辑项目名（去掉重复显示）+ 居中阶段步进器（28px 药丸，可回跳）+ Export（仅 design/dev）+ 设置菜单（AI provider、明暗切换）。
- **右侧面板**：Chat 为家，Spec/Code 为情境视图（头部 icon 切换）；进入 spec/dev 阶段自动打开对应视图一次。
- **左侧**：design/dev 下默认 48px 图标栏，点击展开 280px（状态持久化）。
- **主题**：暗色默认（此前主题模块因 ThemeSwitcher 删除而休眠），菜单显式明暗切换。
- **水獭吉祥物**：AI 生成三个真实姿势（挥手/庆祝/设计，原三个文件是同一图片的字节级副本），去水印+压缩，按场景接线；NextStepCard 阶段完成时用庆祝姿势。
- **文案**：全英文统一（清理中文残留），分阶段空状态（idea 邀请聊想法，design/dev 邀请创作）。

## 已知遗留（诚实清单）

- **39 个 lint 错误为存量**：主要在 `figma-rest-import.ts`(12)、`figma-client.ts`(9) 及流水线校验器的"防御性检查 vs 静态类型"策略冲突。R10 零新增，清零需专项。
- **live AI 回合未在 CI 覆盖**：e2e 通过 dev hook 驱动阶段流转；真实 AI 对话→submit→advance 链路在无 key 环境不可测，提示词注入有单测覆盖。
- `scene-cache` 字体像素测试标记 fixme（证明为环境问题：headless 无 Google Fonts key）。
- 2 个 CLI 引擎测试文件因 spawn bun 二进制被排除（`eval-cli`/`tools-cli`）。
- 亮色主题可用但打磨程度低于暗色。
- Figma OAuth（`api/figma-*.js` + `/figma-callback` 路由）为零调用死基建，保留未拆。

## 提交清单

```
b6b58ac feat: real otter pose variants
2f79331 test: align e2e assertions with R10 polish
8b9682e polish: wire dark theme, dedupe TopBar, phase-aware chat empty state
e0e5ec9 test: vitest engine-suite migration + shell e2e overhaul (Slice E)
4d4b94e feat: shell UX overhaul + dev code view (Slice C)
f877672 feat: pipeline data flow + no-key escape hatch (Slice B)
58cfc1b docs: R10 UX overhaul spec
7ac31a1 fix: P0 crash on editor boot
```
