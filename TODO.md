# Lutris.ai 后续迭代任务

> 按优先级排序，P0 为上线阻塞项

---

## P0 — 上线阻塞

### 1. 修复 `bun run build`
- 现象：`vite-plugin-pwa:build` 在 buildEnd 阶段报错，构建失败
- 方向：检查 PWA manifest 配置、icons 路径、workbox 配置是否正确
- 文件：`vite.config.ts`

### 2. 修复 lint errors（70 个）
- 现状：29 warnings + 70 errors
- 方向：逐文件修复，优先修 error（可能包含类型错误、未使用变量等）
- 命令：`bun run lint`

---

## P1 — 上线前建议完成

### 3. QuickActions 弹窗点击外部关闭（R7 #7）
- 现状：Image Dialog 和 Frame Menu 只能通过按钮关闭
- 方案：添加 `onClickOutside` 或 Popover 组件替代
- 文件：`src/components/QuickActions.vue`

### 4. WelcomeOverlay .fig 导入描述修正（R7 #4）
- 现状：仍显示 "导入 .fig 文件"，但 .fig 导入需要 Figma MCP
- 方案：改为 "导入 .svg / .png" 或加连接状态检测
- 文件：`src/components/WelcomeOverlay.vue`

### 5. PWA 离线体验验证（R8 #4）
- VitePWA 已配置，但未实际验证离线场景
- 验证：断网后能否打开编辑器、恢复 IndexedDB 数据

---

## P2 — 体验增强

### 6. 多页面支持（R8 #2）
- 在 LayersPanel 顶部加 page tabs
- 支持新建/切换/重命名/删除页面
- 文件：`src/components/LayersPanel.vue`, `src/stores/editor.ts`
- 后端已有 `listPages`, `switchPage`, `createPage` 工具

### 7. 历史版本 Visual Diff（R8 #3）
- 选中 UndoHistory 条目时高亮变更节点
- 新增=绿色边框、修改=黄色、删除=红色
- 文件：`src/components/UndoHistoryPanel.vue`, `src/stores/editor.ts`

### 8. lint warnings 清理（R8 #8）
- 剩余 29 个 warnings
- 逐步清理，优先新增文件

---

## P3 — 未来迭代（PLAN.md What's Next）

| 功能 | 说明 |
|------|------|
| Prototyping | 帧转场、交互触发器（click/hover/drag）、overlay、全屏预览 |
| Shader effects (SkSL) | GPU 自定义视觉效果 |
| Raster tile caching | 复杂文档的即时缩放/平移 |
| Component libraries | 跨文件发布/共享/消费设计系统 |
| CI tools | 设计 lint、代码导出、视觉回归（headless CLI） |
| Windows code signing | Azure Authenticode 证书 |
| Skewing + OkHCL color | 仿射变换 + 感知均匀色彩空间 |
| WebGPU/Graphite rendering | 下一代渲染后端 |
| .fig compatibility | 更多真实文件的导入/导出保真度 |
| Port remaining figma-use tools | 从 90+/118 补齐到 118 |
| Grid child positioning UI | 列/行 span 控件、网格 overlay |

---

## 上线最低可行条件

1. ✅ 核心编辑功能完整（7 个 Phase 全部完成）
2. ❌ `bun run build` 通过 → 能部署 Web 版
3. ❌ lint errors 清零 → 代码质量基线
4. ✅ 测试全绿（1211 pass / 0 fail）
5. ⚠️ PWA 离线验证 → 确保断网可用

**结论：修复 build + lint errors 后即可上线体验版。**
