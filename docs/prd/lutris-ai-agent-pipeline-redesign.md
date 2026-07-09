# Lutris.ai 产品需求文档 — Agent 驱动的 Idea→Spec→Design→Dev 一条龙

> 版本：v1.0 | 作者：小北 + 小香 | 日期：2026-07-09
> 状态：Draft，待评审
> 前置文档：`PRD.md`（v0.4 OpenPencil 底座调研）、`docs/prd/lutris-ai-ia-ai-workflow-iteration.md`（Create/Spec/Ship IA 草案，已部分实现但方向仍是画布驱动）

---

## 1. 为什么要推翻重做

### 1.1 现状诊断

代码 review 结论：技术底座扎实（Skia渲染引擎、.fig原生读写、90+ AI工具、P2P协作），但产品定义错了方向。

现有架构：
```
用户打开产品 → 空白画布(Figma式) → 手动画 或 用AI Chat面板辅助画
  → 完成后同步到 Spec 面板(把设计转成PRD文字)
  → Ship 面板导出标注/代码
```

**根本问题**：画布是主战场，AI是辅助工具。用户要先学会用一个类Figma编辑器，才能开始"用AI设计"。这跟"idea→spec→design→dev 一条龙 agent 体验产品"的定位是反的——用户应该先说话，产品应该先干活。

最后一次迭代想接 Google Stitch 做"设计稿→PRD"自动化，方向也是反的（应该是 idea→PRD→设计，不是设计→PRD），死磕认证问题3天无果，项目搁置。

### 1.2 三个方向性决定（已与小北确认）

1. **杀掉 Google Stitch 集成**。方向反了，砍掉不可惜。
2. **保留技术底座，推翻交互层**。Skia渲染/AI工具/文件读写 全部保留；画布从"主战场"降级为"验收/微调工具"，不再是默认打开的第一屏。
3. **交付内容从"标注"改为"可运行代码"**。标注是给人肉传递用的，不符合 agent 产品定位；交付物必须是能跑起来的东西。

---

## 2. 产品定位（新）

**一句话定位**：说出你的产品想法，Lutris.ai 的 Agent 帮你把它变成结构化需求、可视化设计稿、和能跑的前端代码——全程对话驱动，画布只是给你确认和微调用的。

**不是**：Figma替代品、Lovart竞品、AI辅助的设计编辑器
**是**：面向 PM/独立开发者的"idea到可交付代码"agent 管线产品

**核心差异化**：不是"AI生成设计图片"（Lovart等已经在做），而是**全链路结构化输出**——每一步的产出都是下一步的结构化输入（Idea→Spec是数据不是文字聊天记录，Spec→Design是数据不是图片，Design→Dev是场景图不是截图转代码）。这是靠底层 Skia 场景图 + Figma兼容数据结构才能做到的护城河，纯AI画图工具做不到这个精度。

---

## 3. 整体体验流程

```
① Idea 对话
   用户说想法(文字/语音) → Agent 反问关键决策点
   ↓ 产出：结构化 Idea Brief（不是聊天记录）

② Spec 生成
   Agent 基于 Idea Brief 生成：用户故事 + 页面清单 + 核心交互规则
   人工在此确认/修改字段(不是改画布)
   ↓ 产出：结构化 Spec（页面列表 + 每页的组件需求 + 交互规则）

③ Design 生成
   Agent 基于 Spec 直接生成完整设计稿(调用现有 90+ AI 工具在场景图上生成节点)
   人工验收：点选某处说"这里改成xx"，画布仅用于框选/局部微调，不是从零画
   ↓ 产出：完整场景图（.fig 兼容，可继续在 Figma 编辑，也可以被系统消费）

④ Dev 交付
   一键生成：可运行前端代码(Vue/React 组件树，不是单文件JSX片段) + Design Token + 变更日志
   ↓ 产出：可运行代码仓库/组件包
```

**关键原则**：
- 默认打开产品看到的第一屏是对话框，不是画布
- 画布随着 Design 阶段自动出现，作为"这是我生成的东西，你看看对不对"的确认工具
- 每一步之间是数据流转（结构化对象），不是文本复制粘贴

---

## 4. 交互逻辑设计

### 4.1 谁主导

| 阶段 | 主导方 | 人的动作 |
|---|---|---|
| Idea | Agent 主导，追问关键决策点 | 回答问题、补充细节 |
| Spec | Agent 生成初稿，人复核 | 编辑结构化字段（不是改画布） |
| Design | Agent 生成，人验收 | 框选+口头修改指令，少量手动微调 |
| Dev | Agent 全自动生成 | 审阅代码 diff，确认交付 |

对比现状：现在 AI 是"人操作画布时的辅助面板"；新方案是"Agent 是主执行者，人是审阅者+决策点"。这是根本性的角色反转。

### 4.2 关键交互细节

**Idea 阶段**：
- 输入框永远在最上层，类似 ChatGPT 首屏，不是嵌在某个面板里
- Agent 不是"生成一堆然后让人选"，而是主动提问缩小范围（"这个页面主要给谁用？核心操作是什么？"）——避免生成大量无用产出后被推翻
- 达到"信息足够生成 Spec"的阈值后，Agent 主动提示"我可以开始生成需求文档了"

**Spec 阶段**：
- 呈现形式是结构化表单/卡片列表（页面列表、每页组件清单、交互规则），不是一段 markdown 文本
- 每个字段可编辑，编辑后 Agent 感知变更并联动更新后续阶段（比如改了"核心操作"，设计阶段会重新生成相关交互）
- 允许人工新增/删除页面项

**Design 阶段**：
- 生成方式：Agent 调用现有 90+ AI 工具（create/modify/structure等）直接操作场景图，跳过"让AI写一段JSX再解析"这种慢路径
- 验收交互：框选画布区域 + 说话（"这个按钮改圆角"），不需要打开属性面板手动调参数（属性面板保留但降级为高级选项，不是默认交互方式）
- 支持"重新生成这一页" / "保留这一页，重新生成下一页" 的局部重试，避免一次没对就全部重来

**Dev 阶段**：
- 交付物是组件树代码（Vue SFC 或 React 组件，对应 Spec 里的页面结构），不是单个节点的 JSX 片段
- 附带 Design Token（颜色/字体/间距变量）+ 变更日志（这次改了哪些页面/组件）
- 提供"下载代码" / "推送到 Git 仓库"（P1，需要简单后端）两种交付方式

---

## 5. 交付内容重新定义

| 维度 | 现状 | 新方案 |
|---|---|---|
| 核心产出 | 标注（间距/颜色/圆角标记，给人看的） | 可运行代码（组件树，能跑的） |
| 代码导出 | 单节点 JSX 片段 | 完整页面/组件的 Vue SFC 或 React 组件，符合 Spec 定义的页面结构 |
| Design Token | 已有（CSS Variables/Tailwind Config/JSON），保留 | 保留，作为代码交付的配套产出 |
| Spec 产出 | 自由文本 markdown（PRD面板） | 结构化数据（页面清单+组件需求+交互规则），可被 Design 阶段消费 |
| 标注/Handoff面板 | 现有功能，作为交付一环 | 砍掉作为核心交付物的地位，可保留作为"给设计师看"的辅助导出（P2，非必须） |

---

## 6. 信息架构（IA）变更

### 6.1 现有 IA（保留部分技术，砍掉交互框架）
```
现有：EditorView 打开即画布，右侧 Create/Spec/Ship 三 tab 面板并列
问题：三个 tab 平权，用户默认停留在 Create（画布+AI聊天混合），Spec/Ship 是"顺路去看看"的次要面板
```

### 6.2 新 IA
```
首屏：全屏对话框（无画布）
  ↓ 达到生成阈值
Spec 确认页：结构化卡片列表，全屏或大面板，画布不出现
  ↓ 确认
Design 工作区：画布出现，占主要视觉区域，右侧对话栏常驻(用于局部修改指令)
  ↓ 确认交付
Dev 交付页：代码预览 + 下载/推送按钮，Design Token 面板
```

不是现有的"三个平级 tab"，是"线性阶段流转，画布只在 Design 阶段出现"。

---

## 7. 技术改动量评估

### 7.1 需要砍掉/停用
- Google Stitch 集成全部代码（`api/stitch-mcp.js`、相关 valibot schema、`@google/stitch-sdk` 依赖）—— 直接删除，无需迁移
- 现有 Create/Spec/Ship 三 tab 平级导航结构 —— 替换为线性阶段路由
- `FigmaAnalyzePanel`（设计稿分析生成PRD）—— 方向反了，砍掉

### 7.2 需要新建
| 模块 | 说明 | 预估工作量 |
|---|---|---|
| Idea 对话首屏 | 全屏对话UI + 追问逻辑（可复用现有 `use-chat.ts` composable，改造prompt策略） | 1周 |
| Spec 结构化数据模型 | 定义页面清单/组件需求/交互规则的 schema，替代自由文本PRD | 1周 |
| Spec 编辑UI | 结构化卡片列表，替代现有 markdown SpecPanel（当前仅60行，基本要重写） | 1周 |
| Design 阶段路由/触发 | Spec确认后自动触发批量调用现有 AI tools 生成场景图 | 3-5天（复用现有`ALL_TOOLS`） |
| Dev 组件树代码生成 | 从场景图批量生成多组件的 Vue/React 代码（现有仅支持单节点JSX），需要新的代码生成器识别页面结构→组件拆分 | 2周（技术难度最高的一块） |
| 线性阶段路由/状态机 | 替代现有三tab平级导航 | 3-5天 |

**总计预估：6-8周**，比之前 v0.4 PRD 估的"5-6周MVP"稍长，因为组件树代码生成是新增的硬骨头，且要重写 Spec 数据模型。

### 7.3 可完全复用（技术底座价值所在）
- Skia 渲染引擎、场景图、.fig 读写 —— 零改动
- `packages/core/src/tools/` 下 90+ AI 工具 —— 直接复用，是 Design 阶段生成能力的核心
- 多AI provider支持、Tauri桌面端、P2P协作 —— 保留，协作/桌面端不受此次重构影响

---

## 8. 风险

| 风险 | 等级 | 缓解 |
|---|---|---|
| 组件树代码生成（场景图→多组件Vue/React）技术难度未知 | 🟠 高 | 先做小规模验证（3-5个常见页面模板），再决定是否需要更复杂的组件拆分算法 |
| Spec结构化数据模型设计不当会限制表达力 | 🟡 中 | 先支持"自由文本兜底字段"，结构化字段逐步增加，不追求一次到位 |
| 用户从"我熟悉Figma式画布"切换到"先对话"可能有学习成本 | 🟡 中 | 保留"直接进画布手动画"的入口作为老用户/高级用户逃生舱，但不作为默认路径 |
| 6-8周开发量对当前是否有人力投入未知 | 🟡 中 | 需要小北确认排期和投入 |

---


## 9. 开放问题（已决策，2026-07-09）

1. **组件树代码生成目标框架**：✅ **Vue + React 都要**。7.2节 Dev 模块工作量上修——需要两套代码生成器（共享同一份"场景图→组件树结构"的中间表示，各自套模板输出 Vue SFC / React 组件），不是简单翻倍但显著增加。
2. **是否需要后端**：✅ **要**。支持"推送到 Git 仓库"交付方式，需要后端服务处理 Git 操作（创建仓库/分支、commit、push）和可能的 OAuth（GitHub/GitLab授权）。
3. **老用户"直接进画布"入口**：✅ **不保留**。新流程是唯一路径，没有画布直入的逃生舱，简化了产品但也意味着不再兼容"我就想用它当Figma编辑器"的老用户场景。
4. **产品名称**：✅ **统一为 Lutris.ai**。`package.json` name 从 `open-pencil-app` 改为 `lutris-ai`，同步更新 `desktop/tauri.conf.json`、`packages/core`、`packages/cli` 等子包命名，以及品牌/Landing Page 文案。

### 9.1 决策后对第7节技术改动量的修正

| 模块 | 原预估 | 修正后 | 变化原因 |
|---|---|---|---|
| Dev 组件树代码生成 | 2周（单框架） | **3-3.5周** | 需要"场景图→组件树"中间表示 + Vue模板生成器 + React模板生成器，两套输出但共享中间层，不是简单翻倍 |
| 后端服务（新增） | 未列入 | **1.5-2周** | Git操作API（创建仓库/commit/push）+ GitHub/GitLab OAuth接入 + 简单任务队列（代码生成可能耗时，需要异步） |
| 老用户画布直入入口 | 待定 | **0（不做，无需改动）** | 决策为不保留，省去这部分兼容成本 |
| 命名统一 | 未列入 | **2-3天** | package.json / tauri.conf.json / 子包 / Landing Page 文案全量替换，需要仔细过一遍避免漏改导致构建/发布流程断裂（release流程里有多处硬编码版本号同步机制，见 AGENTS.md） |

**总计预估上修为：8-10周**（原6-8周 + 后端1.5-2周 + React双框架增量1-1.5周 + 命名统一2-3天）。

## 10. 下一步

1. ~~补充详细的 Spec 数据模型 schema~~ → 见第11节，已完成
2. ~~技术验证：场景图→组件树中间表示是否能同时喂给 Vue 和 React 两套生成器~~ → 见第12节 Spike #1，已验证通过
3. 命名统一改造建议单独开一个前置PR，跟功能重构解耦，避免两类改动混在一起review困难
4. 排期 Spike #2：验证后端 Git push 最小可行方案（预估1天）
5. 规划开发排期（8-10周），确认人力投入

## 11. Spec 数据模型（结构化字段定义）

替代现有自由文本 markdown 的 SpecPanel。Spec 是 Idea 对话阶段的产出，也是 Design 阶段生成设计稿的直接输入——所以字段必须是"AI工具能直接消费的结构"，不是给人看的文档。

### 11.1 顶层结构

```typescript
interface Spec {
  id: string
  projectName: string
  createdFromIdeaBriefId: string  // 关联生成它的 Idea Brief
  version: number                  // 每次人工编辑 +1，用于 Design 阶段判断是否需要重新生成
  targetPlatform: 'web' | 'mobile-web' | 'desktop'  // 影响布局生成策略
  pages: SpecPage[]
  designSystem: SpecDesignSystem
  freeformNotes: string            // 兜底字段：结构化字段覆盖不到的信息，允许自由文本
}
```

### 11.2 页面 / 组件

```typescript
interface SpecPage {
  id: string
  name: string                      // 如 "商品列表页"
  route: string                     // 如 "/products"，供 Dev 阶段生成路由
  purpose: string                   // 一句话描述这个页面解决什么问题
  userStory: string                 // "作为一个xx，我想要xx，以便xx"
  components: SpecComponent[]       // 页面包含的组件清单
  interactionRules: SpecInteractionRule[]
}

interface SpecComponent {
  id: string
  name: string                      // 如 "ProductCard"，会直接用作生成代码的组件名
  role: 'container' | 'list-item' | 'form' | 'navigation' | 'display' | 'action'
  repeatable: boolean               // true = 这是一个会重复出现的组件（如列表项）
                                     // 对应 spike 发现的"组件识别"缺口：这个字段是给 Dev 阶段代码生成器的显式提示，
                                     // 告诉它"这个应该被提取成独立可复用组件"，而不是靠场景图结构自动推断
  dataBinding?: string              // 如 "product.name"，说明这个组件绑定什么数据（供代码生成器生成 props）
  children?: SpecComponent[]        // 嵌套组件
}

interface SpecInteractionRule {
  id: string
  trigger: string                   // 如 "点击购买按钮"
  action: string                    // 如 "跳转到结算页并携带商品ID"
  targetPageId?: string             // 如果是页面跳转，关联目标页面
}
```

### 11.3 设计系统

```typescript
interface SpecDesignSystem {
  colorTokens: { name: string; value: string; usage: string }[]  // 如 { name: 'primary', value: '#3366E6', usage: '主要操作按钮' }
  typographyTokens: { name: string; fontSize: number; fontWeight: number; usage: string }[]
  spacingUnit: number               // 基础间距单位，如 8（用于生成 8px/16px/24px 等间距）
  cornerRadiusStyle: 'sharp' | 'rounded' | 'pill'  // 影响 AI 工具生成设计稿时的 cornerRadius 取值倾向
}
```

### 11.4 字段设计原则

1. **repeatable 字段是对 spike 发现问题的直接应对**：现有代码生成器无法从场景图结构自动识别"这3个按钮应该是同一个可复用组件"，所以在 Spec 阶段就显式声明，Design 阶段生成时依据这个字段做标记（比如统一命名 `ButtonPrimary-instance-N` 并在场景图节点上打组件归属标记），Dev 阶段代码生成器读取这个标记来决定是否提取独立组件文件。
2. **freeformNotes 兜底**：避免为了追求结构化而限制表达力，结构化字段覆盖不到的都可以先写自由文本，后续版本再逐步结构化。
3. **version 字段驱动增量生成**：人工编辑 Spec 后，Design 阶段只需要重新生成受影响的页面，不必整个项目重来。

---

## 12. 技术验证结果（Spike #1，2026-07-09）

**验证目标**：场景图→组件树中间表示，能否同时驱动 Vue 和 React 两套代码生成器？

**方法**：直接运行现有 `packages/core/src/render/export-code.ts` 的 `selectionToCode()`，构造一个模拟"商品列表页"场景（1个Frame容器 + 3个重复的Button组件实例，每个带一个Text子节点），分别用 `vue-sfc` 和 `react` 两种format生成代码，检查输出。

**结果**：

| 验证项 | 结论 |
|---|---|
| 中间表示是否可复用于两套框架输出 | ✅ **可行**。现有 `buildCodeTree()` 已经产出一份与框架无关的 `CodeNode` 树，`generateVueSFC()` 和 `generateReact()` 各自套模板消费同一棵树，架构完全符合PRD设想，**这部分工作量可以大幅下修，不需要另起炉灶** |
| 多组件场景下的代码质量 | ⚠️ **有缺口**。3个结构相同的 ButtonPrimary 被各自拍平成独立的 `<div>`，生成了3份重复的CSS规则，没有被识别成"同一个组件的3次复用"并提取成独立可复用组件 |
| 布局/样式还原准确度 | ✅ 良好。flex布局、padding、圆角、填充色、文字样式全部正确映射到CSS |

**结论对第7/9节工作量估算的影响**：
- **下修**：Vue+React双框架生成的"中间表示层"不需要重新设计，现有 `CodeNode` 架构就是对的，节省约0.5-1周
- **新增明确任务**：组件识别与提取逻辑——依赖第11节 Spec 数据模型里的 `repeatable` 字段作为显式提示（而非试图从场景图结构做自动推断，这在时间盒内更可行）。这部分工作量计入现有"3-3.5周"估算内，不算新增范畴，但明确了具体做法：不做"智能识别"，做"按Spec标记提取"
- **总工作量估算维持 8-10周**，但技术路径更清晰，风险从"未知能不能做"降低为"已知怎么做"

**下一步验证（Spike #2，待排期）**：验证后端 Git push 最小可行方案（GitHub API创建仓库+commit，预估1天）。
