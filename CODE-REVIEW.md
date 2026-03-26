# Code Review — Lutris.ai (open-pencil)

**Date:** 2026-03-26
**Scope:** Full codebase — `src/`, `packages/core/src/`, `packages/mcp/src/`, `packages/cli/src/`
**Lint/Type status:** Clean (0 warnings, 0 errors via oxlint + tsgo)
**Duplication:** 1.38% lines / 1.71% tokens (39 clones) — under the 3% threshold

---

## Verdict: BLOCK

3 CRITICAL security issues require immediate action before any deployment. 12 HIGH issues affect correctness, security, and data integrity. The codebase is well-structured overall but has accumulated several serious gaps in the security boundary, particularly around AI code execution, credential management, and P2P collaboration.

---

## Summary

| Severity | Security | Correctness | Performance | Code Quality | Total |
|----------|----------|-------------|-------------|--------------|-------|
| CRITICAL | 3        | 0           | 0           | 0            | 3     |
| HIGH     | 5        | 5           | 2           | 0            | 12    |
| MEDIUM   | 3        | 3           | 3           | 3            | 12    |
| LOW      | 2        | 2           | 1           | 3            | 8     |

---

## CRITICAL

### C1. Live API keys committed to git history

**Files:** `.env.production:5,9,13`

Both `.env.production` and `.env.local` contain live credentials committed in the initial commit:

```
VITE_AI_API_KEY=<REDACTED-VITE_GEMINI_API_KEY>
VITE_GEMINI_API_KEY=<REDACTED-VITE_GEMINI_API_KEY>
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Because these are `VITE_`-prefixed, Vite bundles them into client-side JavaScript. Anyone who downloads the production build can extract them. Git history also contains a now-removed OpenAI-compatible key (`sk-RSjw...`).

**Fix:** Rotate all keys immediately. Rewrite git history with `git filter-repo` or BFG. Inject secrets via CI/CD environment variables (Vercel dashboard, GitHub Actions secrets). Provide `.env.production.example` with placeholders.

---

### C2. AI-executed JSX uses `new Function()` — prompt injection → code execution

**File:** `packages/core/src/render/render-jsx.ts:28`

```ts
return new Function('React', result.code)(React) as () => unknown
```

The `render` AI tool accepts JSX from the LLM, compiles it with sucrase, then executes it via `new Function()`. If an attacker can influence the LLM's output (prompt injection via user message, imported PRD, or collab peer), they can execute arbitrary JavaScript in the browser context with full access to `fetch`, `localStorage`, `document`, etc.

**Fix:** Sandbox execution in a Web Worker with no DOM access, or at minimum shadow dangerous globals before execution. A proper fix uses a Worker with `importScripts` blocked and a restrictive CSP.

---

### C3. Hardcoded Google Fonts API key in core package

**File:** `packages/core/src/constants.ts:251`

```ts
export const GOOGLE_FONTS_API_KEY = '<REDACTED-KEY>'
```

Committed to source, bundled into client JS, visible in DevTools. Can be abused for quota exhaustion or billing charges.

**Fix:** Remove from source. Read from `import.meta.env.VITE_GOOGLE_FONTS_API_KEY`. Rotate the current key.

---

## HIGH — Security

### H1. `postMessage` handler accepts OAuth tokens without origin validation

**File:** `src/composables/use-figma-mcp.ts:191-201`

```ts
const handler = (event: MessageEvent) => {
  if (event.data?.type === 'figma-oauth-callback' && event.data?.token) {
    accessToken.value = event.data.token  // ANY origin accepted
```

No `event.origin` check. Any page that can open a popup or embed an iframe can inject a crafted `figma-oauth-callback` message.

**Fix:** Add `if (event.origin !== EXPECTED_ORIGIN) return` before processing.

---

### H2. Unauthenticated P2P collab — any peer can join any room

**File:** `src/composables/use-collab.ts:61-122, 471-481`

Room IDs are derived from project IDs using a weak djb2-style hash. No authentication, no access tokens, no peer verification. Anyone who can guess the room ID receives full Yjs document updates. TURN credentials are hardcoded public demo credentials from OpenRelay.

**Fix:** Add HMAC-signed join tokens. Use private TURN credentials.

---

### H3. Unsanitized markdown rendered via `v-html` — XSS

**File:** `src/components/ProductDocPanel.vue:128-159, 309`

The hand-rolled `renderMarkdown()` function does regex-based HTML generation from user-controlled content (imported files, AI responses) and injects it via `v-html`. No HTML escaping on captured groups. A malicious `.md` file containing `<img src=x onerror=alert(1)>` in a heading or table cell will execute.

**Fix:** Use `DOMPurify.sanitize()` on the output, or replace with `marked` + `DOMPurify`, or reuse `vue-stream-markdown` (already used in `ChatMessage.vue`).

---

### H4. Debug window hooks exposed in production builds

**Files:** `src/composables/use-chat.ts:447-451`, `src/stores/tabs.ts:58`

```ts
window.__OPEN_PENCIL_SET_TRANSPORT__ = (factory) => { overrideTransport = factory }
window.__OPEN_PENCIL_STORE__ = tab.store
```

These allow any script on the page to replace the AI transport or access the full editor state including API keys.

**Fix:** Wrap in `if (import.meta.env.DEV)`.

---

### H5. Automation bridge HTTP server has wildcard CORS

**File:** `src/automation/bridge.ts:143`

```ts
app.use('*', cors())
```

The local automation server accepts requests from any origin. A malicious web page can make cross-origin requests to `http://127.0.0.1:<port>/rpc`.

**Fix:** Restrict CORS to known origins: `cors({ origin: ['http://localhost:5173', 'tauri://localhost'] })`.

---

## HIGH — Correctness

### H6. `draftMessage` destructured from `useAIChat()` but never exported

**Files:** `src/composables/use-chat.ts:453-476` (missing from return), `src/views/EditorView.vue:56`, `src/components/WelcomeOverlay.vue:8`, `src/components/chat/ChatInput.vue:24`, `src/components/ChatPanel.vue:124`

`useAIChat()` returns `pendingMessage` but not `draftMessage`. Four call sites destructure `draftMessage` from it — at runtime it's `undefined`, so `draftMessage.value = '...'` throws. The entire "prefill prompt" flow (quick-start buttons, welcome overlay, PRD import) is silently broken.

**Fix:** Add `draftMessage` as a module-level `ref` in `use-chat.ts` and include it in the return object, or rename all call sites to use `pendingMessage`.

---

### H7. `activeTab` set to `'ai'` — invalid tab value

**Files:** `src/components/ProductDocPanel.vue:87,97`, `src/components/QuickActions.vue:32,46,85,205`, `src/components/TemplateLibrary.vue:14`, and others

The `activeTab` ref is typed `ref<'create' | 'spec' | 'ship'>` in `use-chat.ts:190`. Nine call sites set it to `'ai'`, which is not a valid value. The tab switcher only renders `create`, `spec`, and `ship` — setting `'ai'` leaves the panel blank.

**Fix:** Replace all `activeTab.value = 'ai'` with `activeTab.value = 'create'`.

---

### H8. `weightToStyle` maps weight 400 to "Medium" — breaks font loading

**File:** `packages/core/src/fonts.ts:344-356`

```ts
else if (weight <= 500) label = 'Medium'  // 400 hits here — should be "Regular"
```

Weight 400 is "Regular", not "Medium". This causes font lookups to request `Inter Medium` instead of `Inter Regular`. The companion `styleToWeight` correctly maps "Regular" → 400, so a round-trip produces the wrong result.

**Fix:** Add `else if (weight <= 400) label = 'Regular'` before the Medium branch.

---

### H9. `UndoManager.createPropertyChange` mutates nodes directly, bypassing SceneGraph

**File:** `packages/core/src/undo.ts:122-123`

```ts
forward: () => Object.assign(node, changes),
inverse: () => Object.assign(node, previous)
```

Undo/redo mutates nodes in-place via `Object.assign`, bypassing `SceneGraph.updateNode`. This means `node:updated` events are never emitted, renderer cache invalidation doesn't fire, and multiplayer sync is not notified.

**Fix:** Call `graph.updateNode(node.id, changes)` instead of `Object.assign`.

---

### H10. `reorderChild` has a dead no-op `if` block — off-by-one on same-parent reorder

**File:** `packages/core/src/scene-graph.ts:808-815`

The condition always evaluates to `false` because the node was already removed from `childIds`. The intended index adjustment for same-parent reorder never happens, causing off-by-one errors when dragging layers within the same parent.

**Fix:** Track the original index before removal and decrement `insertIndex` if it's greater than the original position.

---

### H11. `require()` used for dynamic imports in Vite/ESM project

**File:** `src/composables/use-chat.ts:340, 348, 403, 426, 438`

```ts
const { useBrand } = require('./use-brand')
const { useProductDoc } = require('./use-product-doc')
const { useProjects } = require('./use-projects')
```

`require()` is not available in Vite's ESM production build. Works in dev only because Vite polyfills it. The `try/catch` blocks swallow failures silently, defeating tree-shaking.

**Fix:** Use `await import(...)` for lazy loading, or break the circular dependency chain (`use-chat` → `use-projects` → `use-chat`) by extracting shared state.

---

### H12. `detachOrphanedInstances` sets `componentId: ''` instead of `null`

**File:** `packages/core/src/clipboard.ts:201`

`SceneNode.componentId` is typed `string | null`. Setting it to `''` causes `node.componentId != null` checks to behave incorrectly. The `detachInstance` method on `SceneGraph` correctly uses `null`.

**Fix:** Change to `componentId: null`.

---

## HIGH — Performance

### H13. Shared mutable `Float32Array` scratch buffers — aliasing hazard

**File:** `packages/core/src/renderer/renderer.ts:172-173, 225-232`

`color4f()` and `ltrb()` return the same `Float32Array` instance on every call. If CanvasKit defers the read, the value is overwritten before consumption. This is a latent correctness bug on the hot render path.

**Fix:** Document that callers must consume immediately, or use `ck.Color4f()` which allocates per call.

---

### H14. Unbounded WASM object caches — memory leak on large files

**File:** `packages/core/src/renderer/renderer.ts:182-189`

Five caches (`imageCache`, `vectorPathCache`, `fillGeometryCache`, `strokeGeometryCache`, `nodePictureCache`) are unbounded Maps holding CanvasKit WASM heap objects. These don't participate in JS GC. Large documents accumulate WASM memory that is never freed.

**Fix:** Implement LRU eviction with a configurable max size, calling `.delete()` on evicted CanvasKit objects.

---

## MEDIUM — Security

### M1. Gemini API key appended to URL query string

**File:** `src/composables/use-image-gen.ts:35`

API keys in URLs appear in browser history, server access logs, proxy logs, and Referer headers.

**Fix:** Send the key in a header: `'x-goog-api-key': apiKey.value`.

---

### M2. Remote Yjs data applied to graph without schema validation

**File:** `src/composables/use-collab.ts:370-398`

Remote peers can send arbitrary node properties via Yjs. No schema validation on incoming data. A malicious peer could inject unexpected property types.

**Fix:** Validate incoming props against the `SceneNode` schema before applying.

---

### M3. MCP `open_file`/`save_file` path traversal when `fileRoot` is null

**File:** `packages/mcp/src/server.ts:100-108`

When `fileRoot` is `null` (the default), the path check is skipped entirely and any absolute path on the filesystem can be read or written.

**Fix:** Default to `process.cwd()` rather than `null`, or throw if `fileRoot` is not provided.

---

## MEDIUM — Correctness

### M4. `use-spec.ts` singleton state not reset on project switch

**File:** `src/composables/use-spec.ts:8-9`

`specDocument` and `initialized` are module-level singletons. `initSpec()` only runs `syncFromProject()` once. When the user switches projects, spec data from one project can bleed into another.

**Fix:** Watch `activeProjectId` and call `syncFromProject()` on change.

---

### M5. `figma-api.ts` duplicates weight↔style conversion with different formats

**File:** `packages/core/src/figma-api.ts:21-58`

`weightToStyleName` and `styleNameToWeight` duplicate `fonts.ts` exports but use different name formats ("Semi Bold" vs "SemiBold"). Font names produced by `FigmaNodeProxy.fontName` won't match what `collectFontKeys` produces.

**Fix:** Delete the duplicates from `figma-api.ts` and import from `fonts.ts`.

---

### M6. `snap.ts` duplicates `SNAP_THRESHOLD` constant and has dead no-op expression

**Files:** `packages/core/src/snap.ts:4, 105-107`

Private copy of `SNAP_THRESHOLD` (already exported from `constants.ts`). Lines 105-107 contain a ternary where both branches return `guides.length` — a no-op.

**Fix:** Import from `constants.ts`. Remove the dead expression.

---

## MEDIUM — Performance

### M7. `SceneGraph.updateNode` clears entire `absPosCache` on every update

**File:** `packages/core/src/scene-graph.ts:742`

The cache is cleared on every `updateNode` call, even for non-position changes (fills, opacity, text). During layout, `computeAllLayouts` calls `updateNode` for every node — each call wipes the cache.

**Fix:** Only clear when position-affecting properties change (`x`, `y`, `parentId`).

---

### M8. `isFontLoaded` iterates all loaded font keys on every call

**File:** `packages/core/src/fonts.ts:251-253`

Spreads the entire `loadedFamilies` Map into an array on every call. Called for every text node on every render frame.

**Fix:** Maintain a separate `Set<string>` of loaded family names for O(1) lookup.

---

### M9. Deep watcher on `messages` array fires on every streaming token

**File:** `src/components/ChatPanel.vue:77`

```ts
watch(messages, scrollToBottom, { deep: true })
```

During AI streaming, this fires on every token, traversing the entire message tree.

**Fix:** `watch(() => messages.value.length, scrollToBottom)`.

---

## MEDIUM — Code Quality

### M10. `editor.ts` is a 2552-line god file

**File:** `src/stores/editor.ts`

Contains tool definitions, viewport management, clipboard operations, file I/O, export logic, undo integration, and demo shape creation. This is the single largest file in the codebase and violates the 600-line guideline in AGENTS.md.

**Fix:** Extract into focused modules: `stores/editor-clipboard.ts`, `stores/editor-export.ts`, `stores/editor-viewport.ts`, etc.

---

### M11. Duplicate `aiModeLabel`/`aiModeTone` logic across components

**Files:** `src/components/ChatPanel.vue:55-69`, `src/components/WelcomeOverlay.vue:30-40`

Identical computed logic for AI mode badge is copy-pasted with slightly different label strings, causing UI inconsistency.

**Fix:** Move into `useAIChat()` and export as computed refs.

---

### M12. `ProductDocPanel.vue` — dead refs and unused import

**File:** `src/components/ProductDocPanel.vue:2, 34`

`nextTick` imported but never called. `showVersions` declared but never referenced.

**Fix:** Remove both.

---

## LOW

### L1. `colorToFill` double-applies alpha

**File:** `packages/core/src/color.ts:66-74`

Sets both `color.a` and `fill.opacity` to the same alpha value, resulting in `alpha²` effective opacity. A 50% transparent color renders at 25%.

**Fix:** Set `color: { ..., a: 1 }, opacity: rgba.a` or `color: rgba, opacity: 1`.

---

### L2. `generateId` uses module-level mutable counter — IDs collide across SceneGraph instances

**File:** `packages/core/src/scene-graph.ts:343`

`nextLocalID` is module-level. Multiple `SceneGraph` instances in the same process (tests, file import) will produce colliding IDs.

**Fix:** Make `nextLocalID` an instance variable, or use a random session ID per instance.

---

### L3. `setInterval` in `generate_image` tool not cleared on error

**File:** `src/ai/tools.ts:91-103`

If `gen(prompt)` throws, `clearInterval(pulseInterval)` is never reached.

**Fix:** Wrap in `try/finally`.

---

### L4. `watch()` on zoom in collab never stopped — accumulates on reconnect

**File:** `src/composables/use-collab.ts:197-208`

Created inside `connect()` but stop handle never stored or called in `disconnect()`.

**Fix:** Store and call the stop handle in `disconnect()`.

---

### L5. Polling interval in `WelcomeOverlay` — reactivity workaround

**File:** `src/components/WelcomeOverlay.vue:54-59`

500ms `setInterval` to force-recheck canvas content because the reactive computed isn't reliably updating. Symptom of a deeper reactivity problem.

**Fix:** Fix the root cause — ensure `sceneVersion` triggers the computed reliably.

---

### L6. `EditorView.vue` — fragile DOM query for file input

**File:** `src/views/EditorView.vue:119-120`

```ts
document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
```

Queries the entire document for the first file input. Fragile if DOM order changes.

**Fix:** Create a dedicated input element (like the `import-prd` branch does).

---

### L7. `ProductDocPanel.vue` uses emoji in button labels instead of Lucide icons

**File:** `src/components/ProductDocPanel.vue:209,213,258,260,264,325,327,335`

Inconsistent with the rest of the codebase which uses `<icon-lucide-*>` components.

---

### L8. `ENV_API_TYPE` override condition is asymmetric

**File:** `src/composables/use-chat.ts:188`

```ts
if (ENV_API_TYPE !== 'completions') customAPIType.value = ENV_API_TYPE
```

All other env overrides use `!== ''` as the guard. This one uses `!== 'completions'`, meaning an explicit `'completions'` env var won't override a stale localStorage value of `'responses'`.

---

## Duplication Report (jscpd)

39 clones detected (1.38% lines). Notable clusters:

| Source A | Source B | Lines | Issue |
|----------|----------|-------|-------|
| `geometry.ts:36-42` | `snap.ts:39-46` | 6 | Bounds calculation duplicated |
| `geometry.ts:62-72` | `snap.ts:46-60` | 10 | Intersection logic duplicated |
| `fonts.ts:82-94` | `fonts.ts:96-108` | 12 | Font loading branches nearly identical |
| `fig-export.ts:83-91` | `fig-export.ts:112-120` | 8 | Export encoding repeated 3× |
| `clipboard.ts:283-294` | `fig-export.ts:77-87` | 11 | Node serialization duplicated |
| `fig-export-worker.ts:15-22` | `fig-export.ts:256-262` | 7 | Worker message handling duplicated |

**Fix:** Extract shared helpers for bounds calculation, font loading, and node serialization.

---

## Architecture Notes

The codebase is well-organized as a monorepo with clean separation between `@open-pencil/core` (zero DOM deps) and the Vue app. The tool system (`defineTool` → `ALL_TOOLS` → adapters) is a strong pattern. Key structural concerns:

1. `src/stores/editor.ts` at 2552 lines is the primary bottleneck for maintainability. It should be split by domain.
2. Circular dependency between `use-chat` ↔ `use-projects` is worked around with `require()` — this needs a proper fix (shared state module).
3. The `use-spec.ts` / `use-product-doc.ts` / `use-requirements.ts` layering is clean but the singleton initialization pattern is fragile across project switches.
4. The renderer at 1232 lines and scene-graph at 1238 lines are at the upper bound but acceptable given their domain complexity.
