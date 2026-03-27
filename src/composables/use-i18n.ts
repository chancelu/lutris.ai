import { ref } from 'vue'

// ── i18n System ──
// Lightweight internationalization with Chinese and English

export type Locale = 'en' | 'zh'

const STORAGE_KEY = 'Lutris.ai-locale'

const locale = ref<Locale>('en')

// Load stored locale
try {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored && ['en', 'zh'].includes(stored)) locale.value = stored
} catch { /* ignore */ }

type Messages = Record<string, Record<Locale, string>>

const messages: Messages = {
  // Left panel tabs
  'tab.layers': { en: 'Layers', zh: '图层' },
  'tab.assets': { en: 'Assets', zh: '资源' },
  'tab.projects': { en: 'Projects', zh: '项目' },
  'tab.templates': { en: 'Templates', zh: '模板' },
  'tab.components': { en: 'Components', zh: '组件' },
  'tab.history': { en: 'History', zh: '历史' },

  // Right panel tabs
  'tab.design': { en: 'Design', zh: '设计' },
  'tab.code': { en: 'Code', zh: '代码' },
  'tab.ai': { en: 'AI', zh: 'AI' },
  'tab.handoff': { en: 'Handoff', zh: '交付' },
  'tab.figma': { en: 'Figma', zh: 'Figma' },
  'tab.doc': { en: 'Doc', zh: '文档' },
  'tab.comments': { en: 'Comments', zh: '评论' },
  'tab.export': { en: 'Export', zh: '导出' },
  'tab.brand': { en: 'Brand', zh: '品牌' },

  // Common actions
  'action.save': { en: 'Save', zh: '保存' },
  'action.cancel': { en: 'Cancel', zh: '取消' },
  'action.delete': { en: 'Delete', zh: '删除' },
  'action.edit': { en: 'Edit', zh: '编辑' },
  'action.create': { en: 'Create', zh: '创建' },
  'action.import': { en: 'Import', zh: '导入' },
  'action.export': { en: 'Export', zh: '导出' },
  'action.connect': { en: 'Connect', zh: '连接' },
  'action.disconnect': { en: 'Disconnect', zh: '断开' },
  'action.restore': { en: 'Restore', zh: '恢复' },
  'action.reset': { en: 'Reset', zh: '重置' },
  'action.search': { en: 'Search', zh: '搜索' },
  'action.share': { en: 'Share', zh: '分享' },
  'action.undo': { en: 'Undo', zh: '撤销' },
  'action.redo': { en: 'Redo', zh: '重做' },

  // Export panel
  'export.format': { en: 'Format', zh: '格式' },
  'export.scale': { en: 'Scale', zh: '缩放' },
  'export.noSelection': { en: 'No selection — will export entire canvas', zh: '未选中元素 — 将导出整个画布' },
  'export.selected': { en: 'element(s) selected', zh: '个元素已选中' },
  'export.exporting': { en: 'Exporting...', zh: '导出中...' },
  'export.success': { en: 'Exported', zh: '已导出' },

  // Comments
  'comments.title': { en: 'Comments', zh: '评论' },
  'comments.add': { en: '+ Comment', zh: '+ 评论' },
  'comments.reply': { en: 'Reply...', zh: '回复...' },
  'comments.resolve': { en: 'Resolve', zh: '标记解决' },
  'comments.resolved': { en: 'Resolved', zh: '已解决' },
  'comments.empty': { en: 'No comments yet. Click + to start a discussion.', zh: '暂无评论。点击 + 开始讨论。' },
  'comments.all': { en: 'All', zh: '全部' },
  'comments.open': { en: 'Open', zh: '未解决' },

  // Projects
  'projects.new': { en: '+ New Project', zh: '+ 新建项目' },
  'projects.name': { en: 'Project name...', zh: '项目名称...' },
  'projects.versions': { en: 'versions', zh: '个版本' },
  'projects.updated': { en: 'Updated', zh: '更新于' },
  'projects.saving': { en: 'Saving...', zh: '保存中...' },
  'projects.saved': { en: 'Saved', zh: '已保存' },

  // Product Doc
  'doc.title': { en: 'No product document yet', zh: '暂无产品文档' },
  'doc.importHint': { en: 'Import a file or start writing to create your product spec.', zh: '导入文件或开始编写产品规格。' },
  'doc.importFile': { en: 'Import File', zh: '导入文件' },
  'doc.write': { en: 'Write', zh: '编写' },
  'doc.aiParse': { en: 'AI Parse', zh: 'AI 解析' },
  'doc.toDesign': { en: '→ Design', zh: '→ 设计' },
  'doc.document': { en: 'Document', zh: '文档' },
  'doc.versions': { en: 'Versions', zh: '版本' },

  // Figma
  'figma.connect': { en: 'Connect to Figma', zh: '连接 Figma' },
  'figma.connectDesc': { en: 'Import designs, sync tokens, and push changes back to Figma via MCP.', zh: '通过 MCP 导入设计、同步 Token、推送变更到 Figma。' },
  'figma.connectBtn': { en: 'Connect with Figma', zh: '连接 Figma' },
  'figma.import': { en: 'Import', zh: '导入' },
  'figma.export': { en: 'Export', zh: '导出' },
  'figma.tokens': { en: 'Tokens', zh: 'Token' },

  // Brand
  'brand.title': { en: 'Brand Settings', zh: '品牌设置' },
  'brand.logo': { en: 'Logo', zh: '标志' },
  'brand.appName': { en: 'App Name', zh: '应用名称' },
  'brand.tagline': { en: 'Tagline', zh: '标语' },
  'brand.colors': { en: 'Colors', zh: '颜色' },
  'brand.font': { en: 'Font Family', zh: '字体' },
  'brand.radius': { en: 'Border Radius', zh: '圆角' },
  'brand.copyCSS': { en: 'Copy Brand CSS Variables', zh: '复制品牌 CSS 变量' },
  'brand.upload': { en: 'Upload', zh: '上传' },
  'brand.reset': { en: 'Reset', zh: '重置' },
  'brand.preview': { en: 'Preview', zh: '预览' },
  'brand.aiImageGen': { en: 'AI Image Generation', zh: 'AI 图像生成' },
  'brand.geminiKey': { en: 'Gemini API Key', zh: 'Gemini API 密钥' },

  // Offline / network
  'offline.banner': { en: 'Offline — changes saved locally', zh: '离线中 — 更改已本地保存' },

  // Welcome overlay
  'welcome.title': { en: 'Welcome to Lutris.ai', zh: '欢迎使用 Lutris.ai' },
  'welcome.subtitle': { en: 'Start creating with one of these options', zh: '选择一种方式开始创作' },
  'welcome.useTemplate': { en: 'Use Template', zh: '使用模板' },
  'welcome.templateHint': { en: 'Start from a preset', zh: '从预设开始' },
  'welcome.aiGenerate': { en: 'AI Generate', zh: 'AI 生成' },
  'welcome.aiHint': { en: 'Describe your design', zh: '描述你的设计' },
  'welcome.importFile': { en: 'Import File', zh: '导入文件' },
  'welcome.importHint': { en: '.svg, .png, .json', zh: '.svg, .png, .json' },

  // Product Doc extended
  'doc.designSyncTitle': { en: 'Design sync update', zh: '设计同步更新' },
  'doc.designSyncDesc': { en: 'The design has changed. Update the product document to match?', zh: '设计已更改，是否更新产品文档以匹配？' },
  'doc.accept': { en: 'Accept', zh: '接受' },
  'doc.keepCurrent': { en: 'Keep current', zh: '保留当前' },
  'doc.noVersions': { en: 'No versions yet', zh: '暂无版本' },
  'doc.restoreVersion': { en: 'Restore this version', zh: '恢复此版本' },
  'doc.importing': { en: 'Importing document...', zh: '正在导入文档...' },
  'doc.aiParsing': { en: 'Parsing...', zh: '解析中...' },
  'doc.mdToggle': { en: 'MD', zh: 'MD' },
  'doc.sourceToggle': { en: '</>', zh: '</>' },
  'doc.edit': { en: 'Edit', zh: '编辑' },

  // Export extended
  'export.filename': { en: 'Filename', zh: '文件名' },
  'export.exportAs': { en: 'Export as', zh: '导出为' },

  // History / Undo
  'history.revertHere': { en: 'revert here', zh: '回退到此' },
  'history.noActionsYet': { en: 'No actions yet.', zh: '暂无操作。' },
  'history.startEditing': { en: 'Start editing to see your history here.', zh: '开始编辑即可在此查看历史。' },

  // Chat panel
  'chat.emptyState': { en: 'Describe what you want to create or change.', zh: '描述你想创建或修改的内容。' },
  'chat.analyzing': { en: 'Analyzing request…', zh: '分析请求中…' },
  'chat.generating': { en: 'Generating design…', zh: '生成设计中…' },
  'chat.verifying': { en: 'Verifying layout…', zh: '验证布局中…' },
  'chat.creatingImage': { en: 'Creating image…', zh: '生成图像中…' },
  'chat.copyLog': { en: 'Copy log', zh: '复制日志' },
  'chat.copied': { en: 'Copied', zh: '已复制' },
  'chat.clear': { en: 'Clear', zh: '清除' },

  // Comments extended
  'comments.backToAll': { en: '← Back to all', zh: '← 返回全部' },
  'comments.resolve2': { en: '○ Resolve', zh: '○ 标记解决' },
  'comments.delete': { en: 'Delete', zh: '删除' },
  'comments.send': { en: 'Send', zh: '发送' },
  'comments.add2': { en: 'Add', zh: '添加' },
  'comments.addPlaceholder': { en: 'Add a comment...', zh: '添加评论...' },
  'comments.clickToPlace': { en: 'Click on the canvas to place, or add here:', zh: '点击画布放置，或在此处添加：' },
  'comments.noOpen': { en: 'No open comments.', zh: '暂无未解决评论。' },
  'comments.noResolved': { en: 'No resolved comments.', zh: '暂无已解决评论。' },
  'comments.addFirst': { en: 'Add First Comment', zh: '添加第一条评论' },
  'comments.replyCount1': { en: 'reply', zh: '条回复' },
  'comments.replyCountN': { en: 'replies', zh: '条回复' },
  'comments.asUser': { en: 'As:', zh: '作为：' },
  'comments.yourName': { en: 'Your name', zh: '你的名字' },

  // Projects extended
  'projects.noProject': { en: 'No Project', zh: '无项目' },
  'projects.projectsTab': { en: '📁 Projects', zh: '📁 项目' },
  'projects.historyTab': { en: '🕐 History', zh: '🕐 历史' },
  'projects.create': { en: 'Create', zh: '创建' },
  'projects.newBtn': { en: '+ New Project', zh: '+ 新建项目' },
  'projects.versionLabel': { en: 'Version label (optional)...', zh: '版本标签（可选）...' },
  'projects.saveSnapshot': { en: '📸 Save', zh: '📸 保存' },
  'projects.noVersions': { en: 'No versions saved yet. Click 📸 Save to create one.', zh: '暂无保存版本，点击 📸 保存创建一个。' },
  'projects.restore': { en: 'Restore', zh: '恢复' },
  'projects.delete': { en: 'Delete', zh: '删除' },
  'projects.justNow': { en: 'just now', zh: '刚刚' },

  // Template
  'template.title': { en: 'Template Library', zh: '模板库' },
  'template.search': { en: 'Search templates...', zh: '搜索模板...' },
  'template.use': { en: 'Use Template', zh: '使用模板' },
  'template.noMatch': { en: 'No templates match your search.', zh: '没有匹配的模板。' },

  // Theme
  'theme.dark': { en: 'Dark', zh: '深色' },
  'theme.light': { en: 'Light', zh: '浅色' },
  'theme.system': { en: 'System', zh: '跟随系统' },

  // History
  'history.title': { en: 'History', zh: '历史记录' },
  'history.current': { en: 'Current', zh: '当前' },
  'history.initial': { en: 'Initial state', zh: '初始状态' },
  'history.empty': { en: 'No actions yet. Start editing to see history.', zh: '暂无操作。开始编辑即可看到历史。' },

  // Menu bar
  'menu.file': { en: 'File', zh: '文件' },
  'menu.edit': { en: 'Edit', zh: '编辑' },
  'menu.view': { en: 'View', zh: '视图' },
  'menu.object': { en: 'Object', zh: '对象' },
  'menu.text': { en: 'Text', zh: '文本' },
  'menu.arrange': { en: 'Arrange', zh: '排列' },

  // File menu items
  'file.new': { en: 'New', zh: '新建' },
  'file.open': { en: 'Open…', zh: '打开…' },
  'file.save': { en: 'Save', zh: '保存' },
  'file.saveAs': { en: 'Save as…', zh: '另存为…' },
  'file.exportSelection': { en: 'Export selection…', zh: '导出选中…' },
  'file.autosave': { en: 'Auto-save to local file', zh: '自动保存到本地文件' },
  'file.switchProject': { en: 'Switch Project', zh: '切换项目' },
  'file.newProject': { en: 'New Project…', zh: '新建项目…' },

  // Edit menu items
  'edit.undo': { en: 'Undo', zh: '撤销' },
  'edit.redo': { en: 'Redo', zh: '重做' },
  'edit.copy': { en: 'Copy', zh: '复制' },
  'edit.paste': { en: 'Paste', zh: '粘贴' },
  'edit.duplicate': { en: 'Duplicate', zh: '创建副本' },
  'edit.delete': { en: 'Delete', zh: '删除' },
  'edit.selectAll': { en: 'Select all', zh: '全选' },

  // View menu items
  'view.zoom100': { en: 'Zoom to 100%', zh: '缩放至 100%' },
  'view.zoomFit': { en: 'Zoom to fit', zh: '缩放至适合' },
  'view.zoomSelection': { en: 'Zoom to selection', zh: '缩放至选中' },
  'view.zoomIn': { en: 'Zoom in', zh: '放大' },
  'view.zoomOut': { en: 'Zoom out', zh: '缩小' },
  'view.profiler': { en: 'Performance profiler', zh: '性能分析器' },

  // Object menu items
  'object.group': { en: 'Group', zh: '编组' },
  'object.ungroup': { en: 'Ungroup', zh: '取消编组' },
  'object.createComponent': { en: 'Create component', zh: '创建组件' },
  'object.createComponentSet': { en: 'Create component set', zh: '创建组件集' },
  'object.detachInstance': { en: 'Detach instance', zh: '分离实例' },
  'object.bringToFront': { en: 'Bring to front', zh: '移到最前' },
  'object.sendToBack': { en: 'Send to back', zh: '移到最后' },

  // Text menu items
  'text.bold': { en: 'Bold', zh: '加粗' },
  'text.italic': { en: 'Italic', zh: '斜体' },
  'text.underline': { en: 'Underline', zh: '下划线' },

  // Arrange menu items
  'arrange.autoLayout': { en: 'Add auto layout', zh: '添加自动布局' },
  'arrange.alignLeft': { en: 'Align left', zh: '左对齐' },
  'arrange.alignCenter': { en: 'Align center', zh: '水平居中' },
  'arrange.alignRight': { en: 'Align right', zh: '右对齐' },
  'arrange.alignTop': { en: 'Align top', zh: '顶部对齐' },
  'arrange.alignMiddle': { en: 'Align middle', zh: '垂直居中' },
  'arrange.alignBottom': { en: 'Align bottom', zh: '底部对齐' },

  // Pages
  'pages.title': { en: 'Pages', zh: '页面' },

  // Quick actions
  'quick.aiSelect': { en: 'AI Select', zh: 'AI 选择' },
  'quick.aiImage': { en: 'AI Image', zh: 'AI 图片' },
  'quick.newFrame': { en: 'New Frame', zh: '新建画框' },
  'quick.aiChat': { en: 'AI Chat', zh: 'AI 对话' },
  'quick.addSelected': { en: '+ Add Selected', zh: '+ 添加选中' },
  'quick.selected': { en: 'selected', zh: '已选中' },
  'quick.generateImage': { en: 'Generate AI Image', zh: 'AI 生成图片' },
  'quick.generate': { en: 'Generate', zh: '生成' },
  'quick.generating': { en: 'Generating...', zh: '生成中...' },
  'quick.saveKey': { en: 'Save Key', zh: '保存密钥' },
  'quick.getKey': { en: 'Get a free key →', zh: '获取免费密钥 →' },
  'quick.describeImage': { en: 'Describe the image you want...', zh: '描述你想要的图片...' },
  'quick.enterKey': { en: 'Enter your Gemini API key to get started:', zh: '输入 Gemini API 密钥开始使用：' },
  'quick.poweredBy': { en: 'Powered by Gemini', zh: '由 Gemini 驱动' },
  'quick.createFrame': { en: 'Create New Frame', zh: '新建画框' },

  // Toolbar
  'tool.move': { en: 'Move', zh: '移动' },
  'tool.frame': { en: 'Frame', zh: '画框' },
  'tool.rectangle': { en: 'Rectangle', zh: '矩形' },
  'tool.pen': { en: 'Pen', zh: '钢笔' },
  'tool.text': { en: 'Text', zh: '文本' },
  'tool.hand': { en: 'Hand', zh: '抓手' },

  // Share / Collab
  'action.connected': { en: 'Connected', zh: '已连接' },
  'action.joining': { en: 'Join room', zh: '加入房间' },

  // Variables
  'var.title': { en: 'Variables', zh: '变量' },
  'var.open': { en: 'Open variables', zh: '打开变量' },
  'var.count': { en: '{n} variables in {c} collections', zh: '{n} 个变量，{c} 个集合' },
  'var.empty': { en: 'No local variables', zh: '暂无本地变量' },

  // Keyboard shortcuts
  'shortcuts.title': { en: 'Keyboard Shortcuts', zh: '快捷键' },

  // Right panel tabs
  'panel.design': { en: 'Design', zh: '设计' },
  'panel.code': { en: 'Code', zh: '代码' },
  'panel.aiChat': { en: 'AI Chat', zh: 'AI 对话' },
  'panel.handoff': { en: 'Handoff', zh: '交付' },
  'panel.figma': { en: 'Figma', zh: 'Figma' },
  'panel.productDoc': { en: 'Product Doc', zh: '产品文档' },
  'panel.comments': { en: 'Comments', zh: '评论' },
  'panel.export': { en: 'Export', zh: '导出' },
  'panel.brand': { en: 'Brand Settings', zh: '品牌设置' },
}

function t(key: string): string {
  const msg = (messages as Record<string, Record<string, string | undefined> | undefined>)[key]
  if (!msg) return key
  return msg[locale.value] ?? msg['en'] ?? key
}

function setLocale(l: Locale) {
  locale.value = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
  } catch { /* ignore */ }
}

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'zh' : 'en')
}

export function useI18n() {
  return {
    locale,
    t,
    setLocale,
    toggleLocale,
  }
}
