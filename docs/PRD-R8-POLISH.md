# Lutris.ai R8 — 产品体验优化 + 技术债清理

## 产品体验

### 1. AI Chat Streaming 进度反馈
- 当前问题：AI 生成设计时 30-60 秒干等，用户不知道在干嘛
- 方案：在 ChatPanel 中显示分阶段进度（"正在分析 PRD..." → "生成节点中..." → "渲染完成"）
- 文件：`src/components/ChatPanel.vue`, `src/composables/use-chat.ts`

### 2. 多页面支持
- 当前问题：只有一个 page，真实设计项目通常有 5-10 个页面
- 方案：在 Layers 面板顶部加 page tabs，支持新建/切换/重命名/删除页面
- 文件：`src/components/LayersPanel.vue`, `src/stores/editor.ts`

### 3. 历史版本 Visual Diff
- 当前问题：UndoHistory 有了但看不出两个版本之间改了啥
- 方案：选中历史条目时高亮变更的节点（新增=绿色、修改=黄色、删除=红色）
- 文件：`src/components/UndoHistoryPanel.vue`, `src/stores/editor.ts`

### 4. PWA 离线体验验证
- 当前问题：IndexedDB autosave 有了，但 PWA offline 没验证过
- 方案：验证 service worker 缓存策略，确保离线能打开编辑器并恢复上次状态
- 文件：`vite.config.ts` (PWA plugin config), `src/stores/autosave-idb.ts`

## 技术债

### 5. 修复 4 个预存测试 fail
- ACP agent tests (3 个) + CJK font fallback (1 个)
- 文件：`tests/engine/acp-agent.test.ts`, `tests/engine/fonts.test.ts`

### 6. bun run build exit 1 修复
- 原因：bun script runner 把 lint warnings 当 error
- 方案：package.json build 脚本改为 `vite build`（lint 单独跑），或修 bun 兼容性
- 文件：`package.json`

### 7. Playwright e2e 被 bun test 误加载
- 28 个 Playwright e2e 文件被 bun test 扫到报错
- 方案：bun test config 排除 e2e 目录，或移到独立 test config
- 文件：`bunfig.toml` 或 `package.json`

### 8. 41 个 lint warnings 清理
- 全是 warn 级别，不阻塞但影响代码质量
- 逐步清理，优先清理我们新增文件的 warnings

## 优先级
1. [P0] #6 bun build 修复（影响所有人）
2. [P0] #7 e2e 误加载修复
3. [P1] #1 AI streaming 进度
4. [P1] #5 测试 fail 修复
5. [P2] #2 多页面支持
6. [P2] #3 Visual Diff
7. [P2] #4 PWA 离线
8. [P3] #8 lint warnings
