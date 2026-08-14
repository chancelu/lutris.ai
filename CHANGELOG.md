# Changelog

## Unreleased

### Fixes (R20)

- Fix the LLM↔canvas feedback loop being blind to layout accidents — the render tool's quality scan ran BEFORE yoga layout (measuring hug frames at 0×0), only scanned the new subtree (missing collisions with existing siblings), and had no geometry checks at all. Render now computes layout for the current page first, scans both the new subtree and its parent level, and returns a `bounds` field (real computed x/y/w/h of the root and its children) so the model can verify placement against its intent in the same turn
- New geometry defect detection in `detectIssues`: sibling overlap in absolute containers (coverage of the LARGER node > 12%, with decorative-layer and badge exemptions — glow orbs, gradient fills, and named "Glow/Background" layers intentionally sit under content), stacked duplicate frames (same bounds ±8px — the classic "re-render without deleting" pile-up, now also caught at page level), children overflowing the parent's right/bottom edge (skipped for clipped parents and the canvas itself), and loose Text nodes directly on the canvas (orphan fragments from partial deletes)
- Fix the Skia render loop and the autosave thumbnail worker crashing with "Cannot read properties of undefined (reading 'x')" on malformed effects (missing offset/color — older documents or hand-built nodes) — one bad node killed every autosave. Effects are now normalized at render time
- New `backdropBlur={n}` JSX prop → BACKGROUND_BLUR effect, for real glassmorphism; the design prompt's glass-card recipe now requires it and warns that plain `blur` fogs the card's own content (the model was LAYER_BLUR-ing glass cards, smearing their text)
- Design prompt gains layout-hygiene rules: content belongs in flex containers (absolute x/y only for free-floating decorations), text/icons that sit on a card must live INSIDE that card's frame (floating text siblings are the #1 overlap source), decorative layers go first in child order with "Glow"/"Background" names, and page-level duplicates are called out as the worst defect — delete the old top-level frame BEFORE re-rendering a page

### Design (R19)

- AI-generated designs were stuck at "flat wireframe" level because the tool layer physically couldn't express anything but solid colors — the JSX `bg` prop only accepted hex and dropped gradients on the floor, even though the Skia renderer has full gradient support. `bg` now accepts CSS-style gradients end-to-end (`bg="linear-gradient(135deg, #10B981, #22D3EE)"` with optional stop positions, `bg="radial-gradient(circle at 30% 20%, #A, #B)"` with 8-digit-hex alpha for glow orbs), parsed by a new `parseGradientFill` in core and rendered as real Skia linear/radial shaders
- The design prompt's quality rules are now a mandatory 5-pass design workflow instead of a hygiene checklist: Pass 0 forces the model to state a design concept in chat before its first render (3 mood keywords, an exact 5-7 hex palette with roles, a type scale, and 1-2 "signature techniques" picked from a menu — gradient mesh bg, glow orbs, gradient primary CTA, glass card, oversized display number, pill navigation, monochrome chart with a single highlight), Passes 1-3 map the existing skeleton/surface/detail rules, and Pass 4 is a self-review loop (`describe` the page, check the checklist AND whether the signature technique actually landed, fix the top 3 issues, only then present). Root cause of "AI 只会画线条和纯色按钮": the model defaults to the safest possible output unless forced to commit to a visual concept first
- The render tool's auto-quality scan now catches the "vertical text strip" defect — when the model pins a small `w` on a Text to align it, CJK strings wrap one char per line and headings read as vertical columns (this renderer has no vertical-text feature, so tall-narrow multi-char text is always a bug). `detectIssues` flags any text whose width allows ≤3 chars/line while its content needs more, with a fix suggestion; the Step 9 checklist carries the matching rule. `detectIssues` is now exported from core

### Design (R15)

- Canvas tools moved from the left vertical rail to a floating horizontal dock at bottom center (Framer/Lovart-style) — easier to reach and matches where the hand already is; tool flyout groups pop upward, and the layers tree opens as a floating glass panel above the dock. `LeftSidebar` is replaced by `ToolDock`; `Toolbar` takes an `orientation` prop
- Right column is no longer a flush full-height sidebar — it floats over the canvas as a rounded glass card (same material language as the rest of the chrome), so the canvas is truly edge-to-edge on all four sides
- Panel view switch redesigned as a segmented inset track (AI / 设计 / Code) with a raised active segment instead of loose accent pills
- Chat input rebuilt as a single capsule — the field and the gradient send button live inside one rounded container with a focus ring, replacing the bordered row of separate boxes
- Zoom controls moved to the bottom-left corner so they never collide with the centered dock or the floating panel
- Phase stepper and panel tabs unified into one segmented-control language (inset track + raised active segment): the stepper drops its number badges, chevrons, and gradient fill for a raised glass segment with a gradient status dot (completed phases keep a quiet accent check), and the panel tabs light their icon in accent when active
- Right-panel IA de-duplicated — the stepper owns the workflow words (Idea/Spec/Design/Dev), so the panel switcher is now icon-only (chat / properties inspector / code export) with clarifying tooltips and a caption naming the current view ("AI 助手 / 属性 / 代码"); the properties icon gets a blue dot when a canvas layer is selected, and stepper tooltips spell out "工作流阶段 n/4" so the two controls stop colliding semantically

### Fixes (R15)

- Fix Spec Studio's "确认 Spec，开始设计" CTA being unreachable — after the right column became a floating overlay (R15), it covered the Spec Studio's right edge, hiding the confirm button behind the AI panel and letting the header slide under the floating TopBar ("改了 idea 之后 spec 里没法进设计"的根因). Spec Studio now reserves safe space for the floating chrome (top + right), so the CTA is always visible and clickable
- Spec Studio gets a permanent "让 AI 重新拆解" entry next to 添加页面 — after editing the idea brief, the old page list stays stale and previously only the empty state offered an AI re-draft, leaving users thinking the spec was stuck

### Design (R14)

- Editor chrome rebuilt as a floating, canvas-first workspace (Framer-style) instead of fixed bars: the TopBar is now three floating glass pills (project / phase stepper / actions) over an edge-to-edge canvas, and the bottom tool dock is gone
- Left side is a slim floating glass rail (~48px) with the tool stack embedded; the layers tree moved into an on-demand floating panel that opens beside the rail instead of a permanent 264px sidebar
- Right column is a segmented tab bar — AI (chat) / 设计 (properties + DesignPanel with a gradient "Edit with AI" entry and an otter empty state) / Code (dev phase, with unread dot) — replacing the old always-split properties column
- New floating zoom controls pill (bottom-right): zoom out / percent reset / zoom in / zoom to fit
- AI design-output quality rules added to the design prompt: pages must be full-bleed 1440×900 (or 390×844) frames whose content fills the frame (no >15% blank regions), long strings (emails/URLs/IDs) get explicit widths so they never wrap mid-string, list rows are 48–64px with aligned columns, charts are card-wrapped with labeled axes in a fixed-height area, and replacing a component requires deleting its entire old subtree (verified via `describe`) so no orphan text/shape fragments survive
- Design prompt gains a "visual craft" (审美层) section — the old rules taught mechanics (spacing, sizing) but not taste, and the output looked like a washed-out wireframe: pale-gray text on white, bare gray placeholder circles for icons/avatars, flat cards with no border or shadow. The prompt now ships concrete recipes the model applies verbatim: surface hierarchy (off-white page #F7F8FA, white cards with hairline border + soft shadow), exact text-color tokens (#111827 / #4B5563 / #9CA3AF, never lighter), one focal element with a colored glow shadow, tonal chart rules (single hue, only the max/current bar at full saturation), and an icons mandate — nav/tab icons must come from `create_icon`, avatars are colored circles with initials, and empty placeholder circles are a critical defect (verified live: the same fitness-app brief went from "pale wireframe" to Apple-Health-style cards with real icons, glow CTA, and highlighted chart bars)

### Design

- R13 "Deep Space" design language — cold blue-black canvas (`#07090F`) + glass material (translucent panel + backdrop blur + hairline border) + electric indigo→cyan gradient (`#6E7BFF → #22D3EE`), replacing R12's warm Atelier. The gradient is reserved for primary CTAs, active phases, and the brand mark; `--font-display` drops the serif for a geometric sans stack
- Brand mark redrawn: `OtterMark` component — the otter mascot as a minimal geometric SVG (rounded gradient tile + white otter face), replacing the old mascot PNGs across TopBar, welcome overlay, loader, landing page, and empty states
- Landing page and boot loader rebuilt in Deep Space (dark hero with grid + glow backdrop, glass preview mockup, gradient CTAs); loader now renders the SVG mark instead of the otter PNG
- Chat: send button and phase CTAs use the gradient + glow; user bubbles are accent-tinted glass; menus, dropdowns, the floating toolbar, Spec Studio cards, and the AI-select popup all moved to the glass material

### Design (R12)

- R12 "Atelier" design language — warm near-black canvas (`#100E0B`) + cream ink (`#F2EDE3`) + restrained champagne-bronze accent (`#C9A254`), replacing R11's sage. New `--font-display` serif stack (Georgia → Songti/Noto Serif SC) for headlines, wordmark, and empty states; light theme moves to a matching deep-bronze accent
- Welcome overlay redesigned as an editorial cover: eyebrow label, serif headline "从一个想法，到可交付的产品", cream pill CTA, and a 4-phase roadmap strip — mascot imagery removed
- TopBar: serif "Lutris" wordmark replaces the otter logo image
- Phase-complete card (NextStepCard) drops mascot art and otter copy for a quiet accent icon + Chinese summary

### Features

- Spec Studio — Spec is now a first-class main-area view instead of a read-only right-column card. The idea brief, page list (name/route/purpose/user story), components (with role + repeatable count), and interaction rules are all editable inline; version history can be restored from a dropdown; "确认 Spec，开始设计" advances the pipeline and kicks off design generation in one click
- Main area switches by phase: idea = welcome cover, spec = Spec Studio, design/dev = canvas. The right column is now just Chat + a dev-phase Code tab
- Entering dev no longer rips the user out of the chat — the Code tab shows a notification dot instead and opens on demand
- Chat input placeholder is phase-aware (idea/spec/design/dev each prompt the right next utterance)
- "Import PRD" lands directly in Spec Studio via a new `skipToSpec` pipeline transition (idea marked skipped)

### Fixes

- Fix phase tool-gating being a no-op mid-turn — the AI SDK's `prepareCall` runs once per turn, not per step, so after `return_to_phase` switched phases the model's next tool call failed with "unavailable tool 'render'" (the true root cause behind "系统暂时无法重绘画布" and the code-only workarounds). The agent now holds the union of all phase tools and re-filters via `activeTools` in `prepareStep` before every step, so a phase switch takes effect on the very next tool call
- Fix design phase never starting on its own — after `submit_spec_output` the model described the pages and ended its turn with an empty canvas. The submit success message now requires rendering the first page in the same turn (one render call per page), then stopping for user review; `submit_design_output` auto-sprints to Dev are discouraged until the user has seen the pages, and its success message drives an immediate `export_code` so the Code panel fills without prompting
- Remove the `eval` tool from the chat agent in all environments — the model was using it to mutate the canvas directly, bypassing render/undo/quality scans (it remains available to automation/MCP channels)
- Fix agent answering design-change requests with code-only exports — in dev the model would declare "系统暂时无法重绘画布" and deliver "fixed" React code that left the canvas stale, which the user cannot iterate on. The dev prompt now mandates the only correct path (`return_to_phase('design')` as the first tool call → canvas edits in the same turn → optional re-export), `export_code`'s own description warns it is a read-only projection and redirects design changes to the canvas, the design prompt requires one-page-per-render when revising (giant multi-page calls get truncated and fail), and all prompts forbid claiming the system "暂时无法" do something the tools can do
- Fix tool errors showing a bare "An error occurred." — the AI SDK's default `onError` sanitizes every stream error (including pre-execute tool-input validation failures) to that generic string. The chat transport now surfaces the real error message (cause-chain unwrapped) in the tool card, so both the user and the model can see what actually failed. `experimental_repairToolCall` also got stronger: schema-mismatch calls whose `jsx` arrived as a non-string are coerced, and truncated inputs cut mid-escape sequence no longer fail the JSX extraction
- Fix agent promising work it never does — after a revision request the model could end its turn with "我已经退回到设计阶段，马上重新生成…请稍等" without a single tool call, leaving the user waiting forever. All phase prompts now carry an "Act, don't promise" rule (anything you say you'll do must be done via tool calls in the same turn; ending with "请稍等/马上…" is forbidden), and `return_to_phase`'s success message explicitly requires continuing with tool calls immediately
- Fix chat history never persisting to IDB — ChatPanel cached a stale local `Chat` instance while saves read the module-level one, so every saved project stored zero messages and reloads lost the conversation. ChatPanel now always uses the current instance (with a `chatInstanceVersion` signal), and restored history renders after reload
- Fix chat bleeding across projects — a race let `ensureChat` build the new project's chat from the previous project's active instance. Chat creation is now guarded until project data finishes loading
- Fix "AI provider settings" TopBar menu doing nothing when the provider is server-configured — the settings trigger was hidden in that state, and the menu's programmatic click raced the dropdown's dismiss layer. The trigger now always renders and the click is deferred past menu close
- Chat errors now surface the root cause (cause-chain) with the provider name and a "检查设置" shortcut instead of a bare red message
- Fix agent loop aborted mid-turn on phase advance — a `watch(currentPhase, resetChat)` fired `chat.stop()` the instant a phase tool advanced the pipeline, so users saw the AI stop halfway or hang. The watcher is removed; the system prompt and tools are rebuilt per call from the live phase instead
- Fix Spec Studio rendering blank when the model sends `keyDecisions` as a string instead of an array — the template's `.join()` threw during render and took the whole editor view down. The value is now normalized at the tool-execution boundary and at every read site
- Fix autosave `DataCloneError` after the first save — the export worker transferred the module-level 1×1 thumbnail buffer, detaching it for every subsequent save. The buffer is now copied before transfer
- Fix canvas bleeding across projects — startup restored the legacy global recovery slot and autosave kept writing to it, racing the per-project switch and letting one project's document land in another. The legacy slot is no longer restored or written; autosave targets the active project's own slot
- Fix stale document/chat written into a newly opened project — project loads now set an `isLoading` guard that blocks all save paths until data has finished loading
- Fix CJK tofu (□□□) in AI-generated designs — without a Google Fonts API key the loader registered Inter's glyph data under the "Noto Sans SC" name, and CanvasKit's TypefaceFontProvider never falls back per glyph. CJK-capable fonts now load via a keyless direct TTF mirror, Inter stand-in data is rejected, and CJK text puts the CJK fallback first in the paragraph's font family list
- Dev-phase prompt now requires all code to go through the `export_code` tool instead of pasting code blocks into chat, so generated code reliably lands in the Code panel
- Fix repeated "Submit Spec Output — An error occurred." failures — the strict tool schema rejected the model's payload before `execute` whenever a component `role` fell outside the picklist (Chinese, "display 组件"), `components` came as bare strings, or `userStory`/`route` was missing; the model got no actionable feedback and retried the same payload, stacking red errors in chat. `submit_spec_output` now uses a lenient schema and normalizes anything page-shaped (role fallback, string components, route/purpose defaults), only soft-failing with `needsMoreInfo` guidance when no pages are provided at all. `submit_design_output` and `submit_dev_output` got the same treatment (empty `pageNodeMap`/`frameworks` now return recovery instructions instead of hard schema errors)
- Fix AI-generated designs rendering as a jumble of overlapping boxes — the design prompt documents "flex containers without w/h hug their content", but the JSX renderer actually defaulted every unspecified axis to FIXED at the 100×100 `createNode` default. Cards came out as fixed squares whose wrapped text spilled over siblings. Unspecified axes now default to HUG (explicit numbers and `fill` stay FIXED; manual canvas resize still switches back to FIXED), matching the documented behavior the AI writes against
- Fix headless text estimation underestimating CJK width by ~40% — `estimateTextSize` now measures CJK glyphs as full-width (~1em) per char instead of applying the latin 0.6em factor to everything
- The pipeline is no longer a one-way door — dev-phase agents used to refuse design changes with "the design is finalized / the canvas can no longer be modified" (the old prompt literally said so). A new `return_to_phase` tool lets the agent walk back to design (or spec) and keep iterating there; the dev/design prompts now state the flow is iterative and that "locked" is never the right answer
- "Send to AI chat" moved to the top of the canvas right-click menu as "发送给 AI 修改" with a toast confirmation and chat-input focus; the selection context now carries the node's real JSX export (capped at 2000 chars) instead of silently dropping it
- Fix opaque "Render — An error occurred." failures — long JSX strings truncated at the token limit produced malformed tool-call JSON that failed before `execute` with a generic message, and the model gave up. Tool calls are now repaired best-effort (`experimental_repairToolCall` extracts the JSX payload from broken JSON), and the render tool returns the real parse error with recovery guidance instead of throwing
- Fix restored AI documents showing text as 100×100 overflow ghosts ("list text missing") — AI-generated TEXT nodes carry no baked size, so after autosave/restore `configureTextLeaf` fell back to the `createNode` 100×100 default whenever the measurement service was unavailable, clipping wrapped lines inside 56px rows. Both layout fallbacks now use `estimateTextSize` (headless estimator) instead of the stored size, and `kiwi-serialize` no longer hardcodes `textAutoResize: 'WIDTH_AND_HEIGHT'` — it round-trips the node's real value (covered by `tests/engine/text-size-roundtrip.test.ts`)
- Fix CJK fallback fonts never repainting — the keyless Noto Sans SC TTF loads asynchronously; when it finished the renderer only invalidated cached pictures but never scheduled a redraw, so the canvas kept showing the pre-load tofu cache forever. `use-canvas` now calls `store.requestRender()` once the fallback family arrives, and CJK text appears a moment after load without user interaction. The same hook also re-runs `computeAllLayouts` — text measured while the fallback was still loading got narrow missing-glyph widths baked into the yoga layout (headers wrapping mid-title), and a repaint alone never corrected them
- Fix `submit_idea_brief` repeatedly failing with empty `{}` arguments — some models (gemini-3.1) write the brief in the message text and invoke the tool with no payload, previously stacking "缺少产品定位摘要（summary）" errors. The tool now unwraps common wrapper keys (`arguments`/`brief`/`input`) and its error explicitly tells the model to pass the brief as tool arguments, not in prose

### Design (R11)

- R11 "Warm Craft" design system — unified brand identity across dark and light themes. Dark theme moves from neutral grays + generic blue to warm charcoal + eucalyptus sage (`#7FBFA1`), matching the existing cream + deep-green light theme and loader. New `on-accent` token for text/icons on accent fills
- Color roles: primary actions are now inverted-neutral (`bg-surface text-panel`); accent is reserved for indication (active phase, tabs, tools, links, focus). Removed all hardcoded Tailwind blue classes and `bg-accent text-white` combos
- Chat: user messages use a calm elevated surface instead of a saturated accent bubble; assistant messages render as plain text on the panel (Lovart-style)
- Phase stepper sits in an inset segmented track; framework tabs in the code view are a quiet segmented control
- Global `:focus-visible` accent ring on interactive elements; accent-tinted `::selection`; `color-scheme` set per theme
- Motion: entrance animations for chat messages, welcome overlay, and the next-step card; restrained hover scaling
- Toasts: default toast is now inverted-neutral with a hairline border instead of solid blue

### Performance

- Offload .fig parsing (unzip + Kiwi decode) to a Web Worker — main thread stays responsive during file open
- Offload .fig compression to a Web Worker during save (was blocking 450ms+)
- Add instance index (`componentId → Set<nodeId>`) — `getInstances()` is O(1) instead of scanning all nodes
- Defer graph event subscription until after layout computation during file open — eliminates redundant `syncInstances` calls
- Cache label collection (sections/components) per scene mutation instead of walking the full tree every frame
- Non-blocking font loading — files render immediately, fonts load in background

### Features

- Idea brief summary card — once the Idea phase is confirmed, a collapsible card showing the product positioning, target users, and core problem stays pinned at the top of the chat panel as the visible source of truth for later phases
- Spec panel shows the confirmed idea brief at the top (positioning / target users / problem) so the view is never blank right after advancing; empty state now explains that pages appear here as the AI breaks down requirements in chat
- Grid layout in AI chat — JSX renderer supports `grid`, `columns`, `rows`, `gap` props with child positioning (`colStart`, `rowStart`, `colSpan`, `rowSpan`) and auto-height grids
- Configurable max output tokens in AI provider settings (default 16384)
- Z.ai AI provider with GLM-5, GLM-4.7, GLM-4.6, GLM-4.5 model families
- MiniMax AI provider with M2.5, M2.1, M2 models

### Fixes

- Fix idea-phase dead-end: when the AI submitted an incomplete idea brief (e.g. empty `summary`), the raw validator message "缺少产品定位摘要（summary）" surfaced in chat as a scary red error. `submit_idea_brief` now pre-validates fields and returns a `needsMoreInfo` result with recovery instructions for the model; chat renders it as a calm amber "Needs more info" state with a friendly hint instead of an error
- Idea-phase prompt now explicitly forbids submitting empty/placeholder brief fields and tells the agent how to recover from `needsMoreInfo` without showing raw errors to the user
- Fix recurring `DataCloneError` on project save — the IDB save path used `structuredClone(toRaw(...))` which only unwraps the outermost reactive proxy; nested chat/pipeline data still threw. Now uses `deepRawClone` for all five project payloads
- Fix detached ArrayBuffer crash when switching pages after saving — export worker now copies image buffers before transferring
- Show warning toast when fonts fail to load, error toast when file open fails
- Fix FillPicker crash when selecting image fills (missing `ref` import from #92)
- Fix Google Fonts TLS/network errors not cached — failed families no longer retry on every render
- Fix CJK text garbled when font is unavailable — fallback now renders through paragraph shaper instead of raw `drawText`, preserving CJK characters via the fallback font chain
- Fix auto-layout overflow in AI-generated designs — text wrapping, min/max constraints, absolute positioning, and FILL sizing now work correctly
- Fix `layoutAlignSelf` limited to STRETCH — full range supported (CENTER, MAX, MIN, BASELINE)
- Fix hidden auto-layout children losing their dimensions on layout recompute
- Fix ProviderSettings popover not visible in AI chat
- Fix paste/copy/cut intercepted by canvas in AI chat input
- Strip TypeScript casts from AI-generated JSX (`as any`, `as const`)
- Fix parsing complex .fig files crashing on missing GUIDs in component overrides
- Fix headless text layout using 100×100 default size instead of estimated dimensions

## 0.9.0 — 2026-03-09

### Features

- XPath query command — `lutris query design.fig "//FRAME[@width < 300]"` to find nodes by type, attributes, and tree structure using XPath selectors
- CSS Grid layout mode — select a frame, click the grid icon in the auto layout toolbar to switch from flex to grid. Configure column/row tracks (fr, fixed px, auto), column and row gaps, and per-side padding. Powered by a [Yoga fork](https://github.com/open-pencil/yoga/tree/grid) with cherry-picked CSS Grid PRs from upstream
- JSX and Tailwind CSS export for grid layouts — `grid grid-cols-N`, `gap-x-*`/`gap-y-*`, child `col-start-*`/`row-start-*`/`col-span-*`/`row-span-*`
- Multi-provider AI support — connect to Anthropic, OpenAI, Google AI, or any OpenAI-compatible endpoint directly, in addition to OpenRouter. Per-provider API key storage, provider settings popover, automatic migration from single OpenRouter key
- Anthropic-compatible provider for custom API endpoints
- New AI tools: `get_jsx` (JSX roundtrip view), `diff_jsx` (structural diff), `describe` (semantic role, visual style, layout, design issues)
- AI visual verification — `export_image` returns image content to the model for vision-based review
- API type toggle (Completions/Responses) for OpenAI-compatible providers
- Figma zoom shortcuts — ⌘0 (100%), ⌘1 (zoom to fit), ⌘2 (zoom to selection), ⇧1/⇧2 alternatives
- XPath query tool — `query_nodes` for AI/MCP with attribute selectors, tree traversal, and type filtering

### Fixes

- Serialize variables, collections, and bindings to `.fig` files — previously lost on save (#65)
- Text nodes created via MCP now render in Figma — emit `derivedTextData` with font metadata and layout size (#64)
- Double-click on layer tree no longer toggles expand/collapse — use the chevron instead
- Page rename input matches layer rename styling
- Fix `w="fill"`/`h="fill"` in JSX renderer — now direction-aware based on parent flex axis
- Fix text auto-resize defaulting to fixed 100×100 — text without explicit width uses `WIDTH_AND_HEIGHT`
- Fix `clipsContent` not propagated to Yoga — frames with clip enabled now set `Overflow.Hidden`
- Fix `COUNTER_ALIGN_MAP` mapping stretch to `MIN` instead of `STRETCH`
- Fix JSX export omitting x/y for absolute-positioned children
- Fix JSX export ignoring `textAutoResize` for text sizing
- Fix drag terminating on mouseleave — drags now continue outside the canvas
- Fix `export_image` stack overflow on large nodes — chunked base64 encoding
- Undo support for auto-layout reorder, layer tree reorder, and drag reparent
- Page snapshot undo for AI tool mutations
- Fix collab sync for same-parent reorder — `node:reordered` events now propagated to Yjs peers
- Fix orphaned instances on clipboard paste — detach to FRAME when component is missing
- Fix text typography lost on Figma clipboard import — preserve fontFamily, fontWeight, fontSize, lineHeight
- Fix `copyFill` missing `gradientTransform` and `imageTransform` — gradient fills now round-trip correctly


### Performance

- Event-driven rendering and component sync — `SceneGraph` emits typed events on mutations; `requestRender()` calls reduced from 94 to 22, component instance sync uses microtask batching with deduplication
- Replace `structuredClone` with typed copy helpers for fills, strokes, effects, and style runs (~24× faster in hot paths)
- Filter .fig unzip to only decompress canvas and image entries, skipping metadata cruft


### Improvements

- Padding on a frame auto-enables vertical auto-layout
- AI tools run `computeAllLayouts` after execution — layout updates immediately
- Enhanced AI system prompt with full JSX prop reference and verification workflow
- Chat panel preserves messages when toggling UI visibility
- SceneGraph event bus (nanoevents) — `node:created`, `node:updated`, `node:deleted`, `node:reparented`, `node:reordered` events replace monkey-patching in collab sync and manual render invalidation
- Replace esbuild-wasm (14 MB) with sucrase (201 KB) for JSX transform — `buildComponent()` and `renderJSX()` now synchronous and browser-compatible
- `useMagicKeys` keyboard shortcut system — replaces tinykeys with VueUse built-in, cross-platform Meta/Control handling, modifier exclusion for combo conflicts
- Dev-only debug toolbar for copying chat logs
- Auto-layout icons in layer tree — vertical (rows), horizontal (columns), and grid icons for auto-layout frames; components keep their purple diamond
- Frame titles on canvas are now draggable — clicking a selected top-level frame's name label starts a drag
- Compact layout controls — icon-based gap (↔/↕) and padding (T/R/B/L) inputs instead of text labels
- Auto-detect horizontal vs vertical direction when wrapping in auto layout (Shift+A)
- Fix alignment grid for vertical layouts — visual positions now match spatial axes
- Fix grid switch from HUG-sized frames — frame expands to fit children
- Remove unwanted white fill when wrapping in auto layout

## 0.8.0 — 2026-03-07

### Features

- Mobile layout & PWA — responsive editor with touch-optimized toolbar, swipeable bottom drawer (layers/properties/design/code), HUD overlay, and installable PWA with icons and service worker
- Tailwind CSS v4 JSX export — export selections as HTML with Tailwind utility classes (`<div className="flex gap-4 p-3">`) from the Code panel, CLI (`bun lutris export --format jsx --style tailwind`), or programmatically via `sceneNodeToJSX(id, graph, 'tailwind')`. Supports layout, sizing, colors, border radius, opacity, rotation, overflow, shadows, blur, and typography. Uses v4 spacing semantics (px/4 multiplier) with automatic fallback to arbitrary values.
- Code panel format toggle — switch between Lutris.ai (custom components) and Tailwind (HTML + utility classes) output
- Homebrew tap — `brew install open-pencil/tap/lutris` for macOS (arm64 + x64), auto-updated on each release
- Double-click to rename layers — inline rename in layer panel, shared `useInlineRename` composable
- New AI/MCP tools: `analyze_colors`, `analyze_typography`, `analyze_spacing`, `analyze_clusters`, `diff_create`, `diff_show`, `get_components`, `get_current_page`, `arrange`, `node_to_component`
- CLI-to-app RPC bridge — all CLI commands work against the running app when no file is specified. Start the app, then run `bun lutris tree` to inspect the live document
- VitePress docs site — user guide, reference, architecture, and development docs at lutris.ai with 6 locales (en, de, fr, es, it, pl), SEO (OG tags, hreflang, JSON-LD, sitemap), and dark theme

### Improvements

- Refactor mobile drawer tabs, layout sizing dropdowns, and inline rename to use Reka UI primitives
- Add shared UI style helpers with tailwind-variants for menus, selects, buttons, and surfaces
- Unified tool definitions — define once in `packages/core/src/tools/`, automatically available in AI chat, CLI, and MCP
- Harden FigmaAPI — hide internals via Symbols, freeze arrays, fix `layoutSizing`, 30+ new properties and methods
- Split tools into domain files (read, create, modify, structure, variables, vector, analyze) — easier to navigate and extend
- Replace inline type definitions with named types (`Color`, `Vector`, `SceneNode`) across the codebase
- Split 3200-line `renderer.ts` into `packages/core/src/renderer/` with 10 focused files (scene, overlays, fills, strokes, shapes, effects, rulers, labels)
- Centralize all color utilities in `packages/core/src/color.ts` — `colorToHex8`, `colorToCSSCompact`, `normalizeColor`, `colorDistance`; remove 5 duplicate implementations across the codebase
- Add `geometry.ts` with shared rotation math (`degToRad`, `radToDeg`, `rotatePoint`, `rotatedCorners`, `rotatedBBox`)
- Extract `isArrayMixed()` helper for multi-selection property panels

### Fixes

- Fix drawer animation jump on close — single spring transition instead of two-phase
- Fix `ALL_TOOLS` registry missing newer tools (`analyzeColors`, `diffCreate`, `exportImage`, `arrangeNodes`)
- Fix `renderJSX` typo in tool definitions (`renderJsx` → `renderJSX`)
- Fix all oxlint warnings and tsgo errors — replace `!` non-null assertions in `use-collab.ts` with local const captures
- Fix broken test imports — stale `../../src/engine/` paths updated to `@open-pencil/core`
- Fix flaky E2E tests: layers panel navigates to `/demo`, zoom-to-fit test zooms in first, snapshot rendering stabilized with `workers: 1` and `colorScheme: dark`
- Fix bogus .fig import mappings for `expanded` and `strokeMiterLimit` fields
- Fix PWA manifest error in dev mode, handle invalid font data gracefully
- Fix eval response unwrapping and `export_jsx` page selection in RPC bridge
- Fix automation commands not recomputing layouts after mutations
- Fix workspace dependency not resolved when installing from npm (switch CI to pnpm publish)

### Internal

- Add `motion-v` for declarative animations — used in mobile drawer (spring-animated height with pan gestures) and toolbar (layout-animated category switching with directional slide transitions)
- Mobile drawer: replace `useSwipe` + manual rAF animation with `motion.div` `:animate` + `@pan`/`@panEnd`; always-on tab state (no more null `activeRibbonTab`); content stays rendered when closed
- Mobile toolbar: replace manual `scrollWidth` measuring + inline CSS transitions with `motion.div layout` + `AnimatePresence` directional slide variants
- Mobile UI cleanup: extract shared `colorToCSS` util to core, `initials` to `src/utils/text`, `toolIcons` to `src/utils/tools`; replace hand-rolled dropdowns with reka-ui Popover/DropdownMenu; narrow `mobileDrawerSnap` type to string union; move magic numbers to constants; disable PWA service worker in dev mode
- 83 new E2E tests (57 → 140): design panel, code panel, components, copy/paste, multi-page, text editing, keyboard shortcuts, context menu
- 150 new unit tests (588 → 738): color, undo, snap, vector, style-runs, text-editor
- 48 new E2E tests (9 spec files) + 26 mutation unit tests + store/canvas test helpers
- Add `data-test-id` attributes to AppearanceSection, LayoutSection, TypographySection, VariablesDialog, EditorView

## 0.7.0 — 2026-03-05

### Features

- SVG export — export selections as SVG from the export panel, context menu, CLI (`bun lutris export --format svg`), or MCP/AI tools (`export_svg`). Supports rectangles, ellipses, lines, stars, polygons, vectors, text with style runs, gradients, image fills, effects, blend modes, clip paths, and nested groups (#46)
- Copy/Paste as submenu in context menu — Copy as text, Copy as SVG, Copy as PNG (⇧⌘C), Copy as JSX
- Stroke align (Inside/Center/Outside) with clip-based rendering matching Figma behavior
- Individual stroke weights per side (Top/Right/Bottom/Left) with side selector dropdown
- Google Fonts fallback — automatically loads fonts from Google Fonts API when not available locally
- Auto-save toggle in File menu — disable to prevent automatic writes to the opened .fig file
- Renderer profiler with in-canvas HUD overlay, GPU timing, and phase instrumentation

### Improvements

- Replace custom color picker with Reka UI Color components (ColorArea, ColorSlider, ColorField) — adds keyboard navigation and accessibility to the color area, hue, and alpha controls

### Fixes

- CJK text rendering — load a system CJK font (PingFang SC, Microsoft YaHei, Noto Sans CJK) as fallback; falls back to Noto Sans SC from Google Fonts when no system font is available (#48)
- Font registration errors no longer cache invalid font data — `loadFont` only caches after successful CanvasKit registration
- Fix `render` tool failing on Windows + Bun with "Cannot find module" error (#43)
- Fix hover highlighting nodes from internal component pages — scope hit-test to current page
- Fix hit-testing on transparent frames and groups — empty containers without fills or strokes are now click-through, clipping parents reject hits outside their bounds, matching Figma behavior
- Fix instance overrides on .fig import and clipboard paste — resolve guidPaths by overrideKey, handle component swaps (`overriddenSymbolID`), propagate through nested clone chains. Import and paste now share a single override engine.
- Apply Figma component property assignments on import — boolean visibility toggles and instance swaps via `componentPropRefs`/`componentPropAssignments`
- Apply `derivedSymbolData` sizes on import — containers now shrink correctly when component properties hide children
- Fix override resolution for nested instance targets — check the current node before searching descendants
- Fix component property assignments for nested instances — resolve scoped `componentPropAssignments` inside `symbolOverrides` via guidPath, handle `guidValue` for instance swaps, reorder phases so transitive sync doesn't clobber visibility
- Pixel-perfect vector rendering using pre-computed `fillGeometry`/`strokeGeometry` blobs from .fig files — eliminates white gaps between adjacent stroked shapes
- Stroke outlines on clipboard paste — convert vectorNetwork paths to filled outlines via CanvasKit when geometry blobs are unavailable
- Apply `derivedSymbolData` transforms and geometry during import — instance children render at correct scale and position
- Fix internal pages becoming visible after .fig round-trip — preserve `internalOnly` flag on export
- Scope layout recomputation to current page for paste/undo/font-load (major speedup on large multi-page files)
- Show loading overlay until all document fonts are loaded (no more partially rendered text)
- Load fonts when switching pages (previously only loaded for the first page)
- Always show visibility toggle on fill, stroke, and effect rows (matches Figma)
- Fix renderer crash on double destroy when closing files quickly
- Fix .fig page ordering — use deterministic byte comparison for fractional index positions
- Fix text truncation using `textTruncation` field instead of `textAutoResize`
- Fix horizontal scrollbar on design and pages panels
- Style scrollbars for Tauri (thin dark overlay instead of default OS chrome)
- Enable file watcher in Tauri — `watch` feature was missing from `tauri-plugin-fs`

## 0.6.0 — 2026-03-04

### Features

- Multi-selection properties panel — edit position, size, appearance, fill, stroke, and effects across multiple selected nodes
- Shared values display normally, differing values show "Mixed"
- W/H inputs in multi-selection mode
- Flip horizontal/vertical using scale transform instead of rotation
- Single-node alignment aligns to parent frame bounds
- ACP agent package — Agent Communication Protocol server for AI coding tools, reusing core ToolDefs

### Build

- Apple code signing and notarization for macOS builds
- Git LFS storage moved from GitHub to Cloudflare R2


### Fixes

- Fix Figma clipboard paste: extract shared kiwi→SceneNode conversion, fixing broken auto-layout, missing gradient/image fills, effects, style runs, and text properties
- Fix vector rendering on paste — scale path coordinates from Figma's normalizedSize to actual node bounds
- Fix pasted instances having no children — populate from component via symbolData when both are in clipboard
- Detect component sets on import — promote FRAME nodes with VARIANT componentPropDefs to COMPONENT_SET
- Skip internal canvas on paste — components on Figma's hidden internal page populate instances but are not pasted as visible nodes
- Apply instance overrides on paste — text content, fills, visibility, layoutGrow, and textAutoResize from symbolOverrides
- Fix auto-layout child ordering — sort by geometric position instead of z-order position strings
- Load fonts on paste and .fig import — collect font families from text nodes and load into CanvasKit
- Text measurement in auto-layout — use CanvasKit paragraph metrics for WIDTH_AND_HEIGHT text nodes
- Recompute layouts after font loading completes
- Fix PERCENT line height conversion — was stored as raw value instead of pixels
- Fix InvalidCharacterError when copying nodes with non-ASCII text
- Load all font weight/style variants needed by pasted text nodes
- Fix font loading not registering in core cache
- Fix halfLeading applied to text measurement — enable only for rendering
- Clear hover on zoom/pinch to keep scene picture cache valid
- Fix flip buttons using rotation math instead of actual mirroring
- Fix flip transform encoding — scale first matrix column only (was incorrectly producing 180° rotation)
- Decode flip state from .fig transform matrix on import

## 0.5.1 — 2026-03-03

### Fixes

- Fix File → Save crash when document has layer blur effects

## 0.5.0 — 2026-03-03

### Features

- Effects rendering: drop shadow, inner shadow, shadow spread, layer blur, background blur, foreground blur
- Text shadows render on glyphs instead of bounding box
- Multi-file tabs — open multiple documents in tabs within a single window
- Tab bar with close buttons, middle-click to close, and new tab (+) button
- Keyboard shortcuts: ⌘N/⌘T new tab, ⌘W close tab, ⌘O opens in new tab
- Native Tauri menu: File → New and File → Close Tab wired to tab actions
- Render text from SkPicture cache when fonts are missing — pixel-perfect display without the font installed
- Missing font indicator (⚠) next to font picker in the sidebar
- Right-click context menu on layers panel — same actions as the canvas context menu
- 40+ new AI/MCP tools ported from figma-use:
  - Granular set tools: `set_rotation`, `set_opacity`, `set_radius`, `set_minmax`, `set_text`, `set_font`, `set_font_range`, `set_text_resize`, `set_visible`, `set_blend`, `set_locked`, `set_stroke_align`
  - Node operations: `node_bounds`, `node_move`, `node_resize`, `node_ancestors`, `node_children`, `node_tree`, `node_bindings`, `node_replace_with`
  - Variable CRUD: `get_variable`, `find_variables`, `create_variable`, `set_variable`, `delete_variable`, `bind_variable`
  - Collection CRUD: `get_collection`, `create_collection`, `delete_collection`
  - Boolean operations: `boolean_union`, `boolean_subtract`, `boolean_intersect`, `boolean_exclude`
  - Vector path tools: `path_get`, `path_set`, `path_scale`, `path_flip`, `path_move`
  - Create tools: `create_page`, `create_vector`, `create_slice`
  - Viewport: `viewport_get`, `viewport_set`, `viewport_zoom_to_fit`, `page_bounds`
  - Misc: `flatten_nodes`, `list_fonts`
- `set_text_properties` tool: alignment, auto-resize, decoration
- `set_layout_child` tool: sizing, grow, align_self, positioning
- 13 MCP server integration tests via `InMemoryTransport`

### UI

- Resizable pages/layers split in left panel with reka-ui Splitter
- Layers tree auto-expands and scrolls to reveal selected node
- Loading overlay on canvas while opening .fig files
- Hide internal-only pages (e.g. "Internal Only Canvas" in design systems)
- Render page dividers — pages named with only dashes/asterisks/spaces show as horizontal lines
- Only show component labels for COMPONENT and COMPONENT_SET, not instances
- Replace all native `<select>` dropdowns with reka-ui `AppSelect` component
- Smoother trackpad pinch-to-zoom with `Math.exp` curve and deltaMode normalization
- Fix font picker dropdown truncating long font names
- Show explanation in font picker when Local Font Access API unavailable (Safari/Firefox)

### Fixes

- Fix drop shadow rendering on top of fills — shadow now draws behind opaque content
- Fix effect property changes not recorded in undo/redo history
- Fix active tab text invisible against same-color background
- Fix clipboard "Outside int range" error — `pasteID` used unsigned int exceeding Kiwi's signed 32-bit field
- Error toasts are now sticky (don't auto-dismiss), with selectable text, copy button, and close button
- Truncate long node names in export button

### Performance

- Per-node SkPicture cache for effect rendering — unchanged shadow/blur nodes replay from cache on scene redraws
- Drop shadows use `MaskFilter` direct draw instead of `saveLayer` offscreen buffers
- Cached `ImageFilter`, `MaskFilter`, reusable effect paint — zero per-frame WASM allocations for effects
- Reuse GL context on panel resize — swap surface without recreating renderer, preserving all caches
- Per-frame absolute position cache — avoids repeated parent-chain walks during rendering
- Optimize zoom/pan smoothness with `shallowReactive`, `useRafFn`, and input coalescing

### Build

- Auto-populate GitHub Release notes from CHANGELOG.md via `ffurrer2/extract-release-notes@v2`
- Skip already-published npm versions on CI re-runs instead of failing
- Exclude non-app directories from Vite file watcher

### Internal

- Extract shared color constants (`BLACK`, `TRANSPARENT`, `DEFAULT_SHADOW_COLOR`) — replaces 8 inline literals across core
- Extract shared `NodeContextMenuContent` component to avoid menu duplication
- Fix `@open-pencil/core` dep in MCP package: `workspace:*` for local dev (pnpm resolves at publish time)
- Replace store thunks with a late-binding proxy

### Tests

- Clipboard roundtrip tests: encode to Figma Kiwi binary → decode → verify
- 9 visual regression snapshot tests for effects rendering
- Zoom/pan E2E tests and pipeline benchmark
- MCP server edge-case tests for `find_nodes` and Zod validation
- 6 unit tests for absolute position cache

## [0.4.2] (2026-03-02)

### Fixes

- Fix Figma clipboard paste: skip non-visual node types (variables, widgets, stickies, connectors)
- Fix text not rendering after paste — `letterSpacing` from Figma is a `{value, units}` object, was passed as-is → `NaN` broke CanvasKit paragraph layout
- Fix undo/redo for Figma paste — no undo entry was recorded; redo duplicated `childIds`
- Center pasted Figma content in viewport instead of using original coordinates
- Compute auto-layouts after clipboard paste (same as .fig import and demo creation)

### Improvements

- Import additional properties from Figma clipboard: `layoutAlignSelf`, `clipsContent`, `fontWeight`, `italic`, `letterSpacing`, `lineHeight`
- Convert `letterSpacing` PERCENT units to pixels based on font size

### Tests

- 7 new clipboard import unit tests (14 total)

## [0.4.1] (2026-03-02)

### Fixes

- Fix text disappearing after hover when SkPicture cache was recorded before fonts loaded
- Invalidate scene picture cache on font load to prevent stale fallback text

### Docs

- Highlight copy & paste with Figma in README and feature docs
- Replace "fig-kiwi" format name with "Kiwi binary" — the format is shared between .fig files and clipboard

## [0.4.0] (2026-03-02)

### Features

- MCP server (`@open-pencil/mcp`) — 29 tools for headless .fig editing via stdio (Claude Code, Cursor, Windsurf) or HTTP (Hono + Streamable HTTP with sessions)
- `Lutris.ai-mcp` and `Lutris.ai-mcp-http` binaries — install globally via `bun add -g @open-pencil/mcp`

### Build

- All packages emit JS via tsgo + fix-esm-import-path — `@open-pencil/core` and `@open-pencil/mcp` work on Node.js without Bun
- Core package exports: `bun` condition → src (dev), `import` condition → dist (npm consumers)
- `@open-pencil/mcp` added to CI publish workflow

## [0.3.2] (2026-03-02)

### Performance

- Re-apply SkPicture scene caching for ~7x faster pan/zoom (0.98ms vs 6.8ms per frame at 500 nodes)

### Tests

- Visual regression tests for SkPicture cache: hover on/off cycle, multiple cycles, mouse hover, scene change + hover
- Type `window.__OPEN_PENCIL_STORE__` globally, remove ad-hoc casts from tests

## [0.3.1] (2026-03-02)

### Fixes

- Fix text disappearing after hovering a frame (revert SkPicture scene caching)
- Fix macOS startup hang: async font loading, show window on reopen

## [0.3.0] (2026-03-01)

### Performance

- SkPicture scene caching — pan/zoom replays cached display list instead of re-rendering all nodes
- Cache vector network paths — avoid rebuilding WASM paths every frame
- Cache ruler and pen overlay paints — eliminate 10 WASM Paint allocations per frame
- Only enable `preserveDrawingBuffer` in test mode
- Hoist URL param parsing out of render loop

### Fixes

- Fix npm publish: use pnpm for workspace dependency resolution with provenance
- CLI version now reads from package.json instead of hardcoded value
- Update README: accurate app size (~7 MB), streamlined feature list, current project structure

## [0.2.1] (2026-03-01)

### UI

- Panel header with app logo, editable document name, and sidebar toggle
- ⌘\\ to toggle side panels for distraction-free canvas
- Panels hidden by default on mobile (< 768px)
- Floating bar with logo, filename, and restore button when panels hidden
- Always show local user avatar in collab header
- Touch support for pan and pinch-zoom on iOS

### Performance

- Stubbed shiki to remove 9MB of unused language grammars (20MB → 11MB bundle)

## [0.2.0] (2026-03-01)

### Collaboration

- Real-time P2P collaboration via Trystero (WebRTC) + Yjs CRDT
- Peer-to-peer sync — no server relay, zero hosting cost
- WebRTC signaling via MQTT public brokers
- STUN (Google, Cloudflare) + TURN (Open Relay) for NAT traversal
- Awareness protocol: live cursors, selections, presence
- Figma-style colored cursor arrows with name pills
- Click peer avatar to follow their viewport, click again to stop
- Stale cursor cleanup on peer disconnect
- Local persistence via y-indexeddb — room survives page refresh
- Share link at `/share/<room-id>` with vue-router
- Secure room IDs via `crypto.getRandomValues()`
- Removed Cloudflare Durable Object relay server (`packages/collab/`)

### UI

- Toast notifications via Reka UI Toast — top-center blue pill for info, red for errors
- Global error handler (window.error + unhandledrejection) shows errors as toasts
- Link copied toast on share and copy link actions
- HsvColorArea extracted as shared component (ColorPicker + FillPicker)
- Scrollable app menu without visible scrollbar
- Selection broadcasting to remote peers

## [0.1.0-alpha] (2026-03-01)

First public alpha. The editor is functional but not production-ready.

### Editor

- Canvas rendering via CanvasKit (Skia WASM) on WebGL surface
- Rectangle, Ellipse, Line, Polygon, Star drawing tools
- Pen tool with vector network model (bezier curves, open/closed paths)
- Inline text editing on canvas with phantom textarea for input/IME
- Rich text formatting: bold, italic, underline per-character via style runs
- Font picker with system font enumeration (font-kit on desktop, Local Font Access API in browser)
- Auto-layout via Yoga WASM (direction, gap, padding, justify, align, child sizing)
- Components, instances, component sets with live sync and override preservation
- Variables with collections, modes, color bindings, alias chains
- Undo/redo for all operations (inverse-command pattern)
- Snap guides with rotation-aware edge/center snapping
- Canvas rulers with selection range badges
- Marquee selection, multi-select, resize handles, rotation
- Group/ungroup, z-order, visibility, lock
- Sections with title pills and auto-adoption of overlapping nodes
- Multi-page documents with independent viewport state
- Hover highlight following node geometry (ellipses, rounded rects, vectors)
- Context menu with clipboard, z-order, grouping, component, and visibility actions
- Color picker with HSV, gradients (linear, radial, angular, diamond), image fills
- Properties panel: position, appearance, fill, stroke, effects, typography, layout, export
- ScrubInput drag-to-change number controls
- Resizable side panels via reka-ui Splitter

### File Format

- .fig file import via Kiwi binary codec (194 definitions, ~390 fields)
- .fig file export with Kiwi encoding, Zstd compression, thumbnail generation
- Figma clipboard: copy/paste between Lutris.ai and Figma
- Round-trip fidelity for supported node types

### AI Integration

- Built-in AI chat in properties panel (⌘J)
- Direct browser → OpenRouter communication, no backend
- Model selector: Claude, Gemini, GPT, DeepSeek, Qwen, Kimi, Llama
- 10 AI tools: create_shape, set_fill, set_stroke, update_node, set_layout, delete_node, select_nodes, get_page_tree, get_selection, rename_node
- Streaming markdown responses (vue-stream-markdown)
- Tool call timeline with collapsible details

### Code Panel

- JSX export of selected nodes with Tailwind-like shorthand props
- Syntax highlighting via Prism.js
- Copy to clipboard

### CLI (`@open-pencil/cli`)

- `info` — document stats, node types, fonts
- `tree` — visual node tree
- `find` — search by name/type
- `export` — render to PNG/JPG/WEBP at any scale
- `node` — detailed properties by ID
- `pages` — list pages with node counts
- `variables` — list design variables and collections
- `eval` — run scripts with Figma-compatible plugin API
- `analyze colors` — color palette usage
- `analyze typography` — font/size/weight distribution
- `analyze spacing` — gap/padding values
- `analyze clusters` — repeated patterns
- All commands support `--json`

### Core (`@open-pencil/core`)

- Scene graph with flat Map storage and parentIndex tree
- FigmaAPI with ~65% Figma plugin API compatibility
- JSX renderer (TreeNode builder functions with shorthand props)
- Kiwi binary codec (encode/decode)
- Vector network blob encoder/decoder

### Desktop App

- Tauri v2 (~5 MB)
- Native menu bar, save/open dialogs
- System font enumeration via font-kit
- Zstd compression in Rust
- macOS and Windows builds via GitHub Actions

### Web App

- Runs at [app.lutris.ai](https://app.lutris.ai)
- No installation required
- File System Access API for save/open (Chrome/Edge), download fallback elsewhere

### Documentation

- [lutris.ai](https://lutris.ai) — VitePress site with user guide, reference, and development docs
- Deployed via Cloudflare Pages
