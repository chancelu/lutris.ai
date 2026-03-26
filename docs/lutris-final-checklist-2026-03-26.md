# Lutris.ai 最后收口 Checklist

## A. WelcomeOverlay
- [x] 首屏方向改成一句定位 + 主 CTA + 3 个起步路径 + 轻 preview
- [x] 下沉重说明，减少首页“讲太多”
- [x] preview 改轻
- [x] 欢迎页图片 / 预览比例第一轮修正
- [x] 桌面端比例细节复查
- [ ] 移动端比例细节复查
- [x] 再压一轮首页视觉重量
- [ ] 再减一点视觉块数量
- [ ] 检查主 CTA 是否在小窗口下仍然绝对显眼

## B. Welcome / Create 单焦点体验
- [x] 三列 onboarding → 单中心布局
- [x] 主入口改成 `Start with prompt`
- [x] 次入口保留 `Import .fig / Import PRD / Blank canvas`
- [x] AI 状态压成 badge
- [x] 文案再压一轮
- [ ] 进一步减少并列决策感
- [ ] 检查 quick prompts 是否仍然有点抢主 CTA

## C. Create 面板减重
- [x] 顶部信息收缩
- [x] 空状态更像 prompt workspace
- [x] suggestions 更轻
- [x] Brand 已下沉成次级入口
- [x] 再降一点“控制台感”
- [ ] recent action card 轻量化
- [ ] 检查空状态 / 有消息状态切换是否足够顺滑

## D. Ship / Export
- [x] 默认只突出 Export
- [x] Code / Handoff 下沉成 secondary layer
- [x] 导出后 next-step 再轻一点
- [x] success message 压轻
- [ ] 确认 next-step card 现在不会重新抢焦点
- [ ] 确认导出成功态在窄窗口下层级仍清楚

## E. Spec 收口
- [x] `SpecDocument`
- [x] `use-spec`
- [x] `use-requirements` adapter
- [x] `use-product-doc` adapter
- [x] `SpecPanel` summary-first
- [x] save requirements 结构化写入
- [ ] versions 再原生化
- [ ] 检查 restore / history / snapshot 语义是否自然
- [ ] 检查 spec summary 与 requirements board 的关系是否足够清晰

## F. 验证 / QA
- [x] lint
- [x] build
- [ ] 最终 UI 联调复查
- [ ] 移动端体验复查
- [ ] 小窗口体验复查
- [ ] 主路径 walkthrough：Prompt → AI output → Save requirements → Spec → Export
- [ ] 空项目 / 有项目 / 多次保存 / 导出后继续编辑 这几条路径各走一遍
- [ ] 确认没有新的文案误导或伪能力承诺
