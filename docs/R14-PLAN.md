# R14 计划：画布交互颠覆式重做 + 全流程跑通 + 产出质量验收

> 目标：idea → spec → design → dev 全流程真实可用；画布区域不是换皮而是交互重构；
> 用真实 AI（google/gemini-3.1-pro via .env.local 服务端配置）从随机想法做出一个
> 好看、可用的 web/app，并据此反推流程设计问题。

## 调研结论（review-r14/）

**Framer 编辑器（主要参考）**
- 顶部一条整合栏：左 = 工具 pill（Canvas ▾ + 四五个工具图标），中 = 上下文（Site · main），右 = 主 CTA（Publish 蓝）+ 次操作
- 右栏一个面板内做 "Agent | Style" 分段切换——AI 对话和属性面板同居一栏
- 纯黑底、极少边框、全部紧凑；没有底部工具栏

**Bolt / v0**
- prompt-first 入口 + 建议 chips；开始成本极低

**Penpot/其他**：无额外启发。

## 任务分解（8–10h）

### B. 流程跑通（优先，~3h）
1. B1 全流程实跑：随机想法「帮独立开发者追踪订阅收入的 SaaS 仪表盘（web）」
   - idea：对话→submit_idea_output，验证 IdeaBriefCard/NextStepCard
   - spec：AI 拆页 + 手动编辑 + 确认推进
   - design：逐页渲染，截图评估，试修改请求（含右键发送元素给 AI）
   - dev：导出代码，检查 Code 面板
   - 记录每一步的失败/卡顿/反人类点
2. B2 修复所有阻断性问题；非阻断但恶心的记 CHANGELOG

### C. 画布 chrome 颠覆式重构（~3h）
基于 Framer 范式：
- C1a 顶栏：固定 TopBar → 悬浮玻璃条（左 OtterMark+项目名+工具组，中 阶段步进器，右 Export/设置）——工具从底部居中挪到顶部左侧
- C1b 右栏：Framer "Agent | Style" 式分段控件——AI 对话 / 属性 / Code(dev) 合一
- C1c 底部右侧：悬浮缩放控件 pill（-/％/+/fit）
- C1d 左 rail 玻璃化微调；画布悬浮元素统一 glass
- 同步更新受影响的 e2e 选择器

### C2. 产出质量评估（~1.5h）
- 对 design 阶段产出截图逐项评估（对齐/层级/配色/触控区/信息密度）
- 不好看 → 调 DESIGN_PROMPT 与渲染器默认值；不可用 → 反推 spec/design 流程缺什么
- 至少完成一轮"评估→修复→重跑"闭环

### D. 收尾（~1h）
- vitest / build / e2e 全绿；验收截图；CHANGELOG；中文总结

## 验收标准
- 从随机想法到 Code 面板有代码，全程无"光说不做"、无绕过画布、无莫名报错
- 画布 chrome 是布局级重构（工具位置/面板结构变化），不是换色
- 产出的 app 页面达到"能拿去当初稿"的设计质量
