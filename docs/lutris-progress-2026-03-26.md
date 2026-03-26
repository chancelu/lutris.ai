# Lutris.ai 当前进度文档

**时间**：2026-03-26  
**状态结论**：**核心 blocker 已解除，项目进入最后一轮 polish + QA 收口阶段。**

## 1. 当前总体判断

今天最关键的进展，不是又做了几个 UI 微调，而是**核心技术链路已经真正打通**了。  
项目状态已经从“还有关键实现卡点”切换成了“主流程可用，剩最后一轮体验收口和验证”。

换句话说：

- **不是卡死**
- **不是还在大拆大建**
- **已经进入最后收尾阶段**
- 但 **checklist 还没有完全清零**

---

## 2. 今天已经完成的关键事项

## A. Spec / Requirements 保存链路打通

已完成 **save requirements 的结构化写入**，不再只是把 AI 输出 append 到 summary。

### 已实现能力
- 从 AI 文本中提取 requirement 行
- 解析为 `Requirement[]`
- 按 `title` 与已有 requirement merge
- 保留已有字段：
  - `id`
  - `linkedNodeIds`
  - `linkedChatMessageIds`
  - `status`

### 影响
这意味着 requirements 已经不再只是“AI 生成了一段文本”，而是开始进入**真正可管理、可追踪、可继续编辑的结构化状态**。  
这是今天最关键的 blocker 解除点。

### 相关文件
- `projects/designflow/open-pencil/src/composables/use-spec.ts`
- `projects/designflow/open-pencil/src/components/ChatPanel.vue`

---

## B. ChatPanel 保存逻辑升级

`ChatPanel` 现在已经改成：

1. **优先尝试 structured save**
2. 如果无法解析出 requirements，再 **fallback 到 requirements draft / summary draft**

### 影响
这让 AI 输出进入 spec 的路径更自然，也避免了“每次都只是丢一段长文本进去”的低效状态。

---

## C. Export 成功态做过一轮减重

`ExportPanel` 的成功反馈已经压轻一轮：

- success toast / success message 更轻
- next-step card 的视觉权重下降
- export-first 的方向更明确

### 影响
导出完成后的界面不再那么“喊叫”，更接近收尾型 UI，而不是再次制造决策负担。

### 相关文件
- `projects/designflow/open-pencil/src/components/ExportPanel.vue`

---

## D. 基础验证通过

### 已通过
- `lint`
- `build`

### 说明
说明当前改动至少已经过了**静态检查 + 构建验证**，不是“看起来改完了但仓库还炸着”的状态。

---

## 3. 当前还没收口的部分

虽然关键 blocker 已解除，但以下几项还没有完全清零：

## 1) WelcomeOverlay 还可以再减一点

当前 WelcomeOverlay 已经完成了大方向调整：

- 三列 onboarding → 单中心布局
- 主 CTA = `Start with prompt`
- 次入口保留
- 文案压过一轮

但从当前页面密度来看，还是有一点**块太多、层次偏碎**的问题。  
还可以继续减一轮视觉块数量，让首屏更像“单一入口”，而不是“轻量版控制台”。

---

## 2) recent action card 还需要轻量化

Create 面板整体已经比之前收了不少，但 `recent action card` 这一层仍然像是“功能存在”，不完全像“体验成立”。  
这部分还值得再压一次视觉重量和存在感。

---

## 3) versions 还需要再原生化一点

现在 versions 虽然已经可用，但从数据结构和语义上看，仍然带一点 adapter / snapshot 过渡层的味道。  
还没完全变成一个“产品层面自然成立”的版本系统。

这不是 blocker，但确实属于最后一轮应该处理掉的收尾项。

---

## 4) 最终联调 + 多尺寸复查还没做完

这部分是当前最典型的“最后 10% 工作”：

- 主流程联调
- 面板之间切换检查
- 移动端检查
- 小窗口 / 窄宽度检查

这类问题通常不会在 lint/build 阶段暴露，但会直接影响最终手感。  
所以现在还不能说“完全 done”，只能说**主功能路径已经过线**。

---

## 4. 当前最真实状态

现在项目最准确的描述应该是：

> **核心数据流已经打通，Spec / Requirements 的结构化保存链路已经完成，lint 与 build 均已通过；当前剩余工作主要集中在 WelcomeOverlay / recent action / versions 的最后一轮 polish，以及最终联调与移动端 / 小窗口验收。**

再说直白一点：

> **最难的坑已经填了。剩下的不是重构级问题，而是收口级问题。**

---

## 5. 简版日报 / Handoff 文案

### 中文简版

> **Lutris.ai 现在已经过了最关键的技术坎，主链路通了，剩下的是最后一轮 UI 收口和多端验收。**

### English handoff

> **Lutris.ai has moved past its main technical blocker. Structured spec/requirements save is now working, build is green, and the remaining work is final UX polish plus responsive / end-to-end QA.**

---

## 6. Commit / PR Summary Draft

### Commit summary

```text
feat(spec): land structured requirements save and continue UX polish

- add structured requirement parsing + merge flow in use-spec
- save requirements from chat into Requirement[] before fallbacking to draft summary
- preserve existing requirement metadata during merge
- lighten export success state and next-step treatment
- keep project build/lint green while moving spec flow toward final polish
```

### PR / handoff summary

```text
This update moves Lutris.ai past its main spec-flow blocker.

What’s done:
- structured requirements save is implemented
- chat now saves parsed requirements first, then falls back to draft text when parsing fails
- existing requirement metadata is preserved during merge
- export success UI has been visually reduced
- lint and build both pass

What remains:
- reduce WelcomeOverlay visual density a bit more
- lighten the recent action card
- make versions feel more native to the product model
- run final responsive + narrow-window + end-to-end QA
```
