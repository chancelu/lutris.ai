# R10 — Lutris.ai UX Overhaul Spec (agent contract)

> Goal: turn Lutris.ai from a messy pro-editor shell into a **simple, guided, otter-friendly**
> idea → spec → design → dev product for non-technical users, Lovart-style restraint.
> This document is the single source of truth for all R10 workers. Read it fully before editing.

---

## 1. Product principles

1. **Chat is home, canvas is the stage.** The right panel is the AI conversation first;
   everything else (spec, code, export) is a temporary view one click away.
2. **One phase, one deliverable, one obvious next action.** No nested tabs, no config walls.
3. **Progressive disclosure.** Hide developer-grade options (base URL, model ID, API type,
   provider zoo) behind an "Advanced" affordance. 小白 users see one recommended default.
4. **The otter guides.** `/lutris-otter.png` (canonical mascot asset — the waving/celebrating/
   designing files are byte-identical duplicates, do NOT reference them) appears on the
   welcome overlay, empty states, and phase-complete moments. Warm, short, jargon-free copy.
5. **Never dead-end.** Every state (no API key, empty spec, phase mismatch) has a visible
   next action. No button may be a no-op.

## 2. Language & copy

- UI copy: **English**, sentence case, short. Replace the remaining Chinese UI strings
  (`EditorView.vue` hint pill ~L190, `UserMenu.vue` "退出登录", `SpecPanel.vue` "新页面 N").
- Code comments may stay as-is.
- No exclamation-mark spam; otter speaks plainly ("Here's your spec." not "🎉 Amazing!!").

## 3. Target information architecture

### TopBar (h-12, single row)
- Left: `/lutris-otter.png` icon + editable project name.
- Center: `PipelinePhaseStepper` (keep; restyle subtly — see §6).
- Right: **Export** button (visible in design/dev; hidden earlier) · **Settings menu**
  (gear icon dropdown: AI provider settings, theme if trivial, keyboard shortcuts via Ctrl+/)
  · UserMenu (only when logged in).
- Remove: the `AI` badge next to the logo, any other clutter.

### Right panel (360px) — `PropertiesPanel.vue` (rename not required)
- Header: icon-switch for contextual views — **Chat** (always) · **Spec** (spec phase and later)
  · **Code** (dev phase). Active view indicated; chat is default.
- Phase-change behaviour: when the pipeline enters `spec`, auto-open the Spec view once;
  enters `dev`, auto-open the Code view once. User can always switch back to chat.
- `Ctrl+J` keeps toggling the Export view; Export view remains accessible from TopBar too.

### Canvas area
- Idea/spec phases: no left sidebar, no toolbar (status quo), hint pill removed — the welcome
  overlay / empty-state covers guidance instead.
- Design/dev phases: **left rail collapsed by default** — a 48px icon rail (Layers, Design)
  that expands to the 280px sidebar on click; collapses back. Toolbar stays bottom-center
  floating pill (6 tools).
- Welcome overlay (idea phase, empty project): otter + "What do you want to build?"
  + large prompt button (focuses chat) + one muted line: "Import PRD · Start from a blank canvas".
  No quick-prompt grid, no badges, no card border — content floats on the dimmed canvas.

### Phase deliverables & next action (the guided loop)
| Phase | Deliverable | Where it shows | Next action |
|---|---|---|---|
| Idea | IdeaBrief | chat summary card | "Review the spec I'm drafting" → spec |
| Spec | SpecPages | Spec view (auto-opens) | "Start designing" → design |
| Design | canvas pages | canvas + layers | "Get the code" → dev |
| Dev | code files | Code view (auto-opens) | Copy / Download / Export assets |

- `NextStepCard` becomes the in-chat phase-complete card: otter icon + one-line summary +
  single CTA. Remove the dead measurementMode toggles.
- Add a **step-back affordance**: stepper already allows jumping back to reached phases;
  keep that. No separate revert UI.

### Dev phase — Code view (mount the orphaned `CodePanel.vue`)
- The `export_code` tool result must be captured into a small reactive store
  (`src/stores/code-output.ts`: `{ framework, files: {path, code}[], exportedAt } | null`,
  updated from the tool's execute in `packages/core/src/tools/export-code.ts` via a
  injected callback — core must stay store-free; register a listener from `src/`).
- Code view: framework tabs (Vue / React / HTML), file list, Prism highlight,
  Copy + Download buttons. Empty state: otter + "Ask the AI to export your code."

### No-API-key path (currently a hard dead end)
- ProviderSetup simplified: one recommended provider (OpenRouter) pre-selected, single
  API-key field, "Advanced options" disclosure for the rest. No CORS wall-of-text; one
  muted line at most.
- "Start from a blank canvas" (welcome overlay + ProviderSetup footer): new pipeline action
  `skipToDesign()` in `use-pipeline.ts` — marks idea+spec `skipped`, lands in design phase,
  canvas chrome unlocks. Chat keeps offering provider setup.

## 4. Critical data-flow fixes (Slice B)

1. **Idea → Spec**: `buildDynamicPrompt()` in `use-chat.ts` must inject
   `pipeline.outputs.idea` (IdeaBrief) into the Spec-phase system prompt.
2. **Spec → Design**: inject the structured `SpecPage[]` (id, name, route, purpose,
   components) from `useSpec()` into the Design-phase prompt, so the design agent renders
   the real spec. Include real page IDs.
3. `submit_spec_output` tool result must include the created page IDs so
   `submit_design_output.pageNodeMap` can reference real keys.
4. Design-phase tool whitelist gains a read-only `get_spec_pages` tool returning the
   current SpecPages (keeps prompt small; agent can re-query).
5. `outputs.idea` / `outputs.spec` must survive chat resets — they live in IDB already;
   just read them in `buildDynamicPrompt`.

## 5. Dead-ends & orphans to fix

| Item | Action |
|---|---|
| `UserMenu` sign-out → `/login` (no route) | Stay in place; just clear session + toast "Signed out". |
| Invisible tab system (`Ctrl+T/N/W`, no UI) | Remove those three keybindings; leave `stores/tabs.ts` untouched. |
| ExportPanel "Create handoff notes" / "Review code output" (toggle measurementMode) | Remove both buttons; NextStepCard takes over phase CTAs. |
| `ChatPanel` "Analyze imported design" (no tools in idea phase) | Show only in design/dev phase. |
| Orphan files: `AppMenu.vue`, `BrandSettings.vue`, `ProjectManager.vue`, `ThemeSwitcher.vue`, `ConfirmDialog.vue`, `HandoffPanel.vue`, `CodePanel.vue` | CodePanel gets mounted (see §3). The rest: delete files (git history keeps them). |
| `properties/{Layout,Stroke,Effects,Typography}Section.vue` + `FontPicker.vue` (orphans) | Mount into `DesignPanel.vue` for single selection, in Figma-order: Position, Layout (auto-layout), Typography (text nodes), Appearance, Fill, Stroke, Effects, Export. |
| `.env.local` dead vars `VITE_GEMINI_API_KEY/MODEL/BASE_URL` | Leave file; not part of UI. |

## 6. Visual rules

- Dark theme first. Borders `border-border/30` or none; separate panels with background
  contrast (`bg-panel` vs canvas), not lines. Splitter/handles: none (fixed widths).
- Radius: `rounded-xl` for cards/popovers; `rounded-full` for pills/buttons where already
  used. No `rounded-[28px]`.
- Type: small (12–13px body), muted for secondary. Generous padding/whitespace.
- Stepper: 4 short pills (Idea · Spec · Design · Dev), current = accent, completed = check,
  unreachable = 40% opacity + `cursor-not-allowed`, reached-but-not-current = clickable
  (hover `bg-hover`). Height 28px, centered in TopBar.
- Otter: 96–128px on welcome overlay, 64px in empty states, 20px in TopBar.

## 7. Non-goals

- No routing changes (except killing the `/login` navigation bug).
- No changes to collab/WebRTC, Tauri, `packages/core` engine internals (except the
  export-code listener hook), LandingPage, CLI/MCP packages.
- No new dependencies without asking. No mascot regeneration (duplicates stay, unused).

## 8. Slices & validation

Environment: node v24 + pnpm 11 (installed). **No bun.** PATH prefix needed:
`export PATH="/c/Users/admin/AppData/Local/Programs/kimi-desktop/resources/resources/runtime:$PATH"`

- Dev server: `npx vite --port 1420 --strictPort`
- Unit: `npx vitest run`
- E2E: start dev server, then `npx playwright test --project=lutris <spec>` (browsers installed)
- Lint: `pnpm run lint` (oxlint; pre-existing errors — don't add new ones)
- Build: `pnpm run build` (known PWA-plugin issue — record, don't fix in slices B–D)

### Slice B (coder 1) — critical runtime & data-flow fixes
Owns: `src/composables/use-chat.ts`, `use-pipeline.ts`, `use-projects.ts`, `src/ai/phase-tools.ts`,
`src/ai/prompts.ts`, `src/components/chat/ProviderSetup.vue`, `src/components/UserMenu.vue`,
`src/composables/use-keyboard.ts`, `src/components/ExportPanel.vue`, `src/components/ChatPanel.vue`
(only the "Analyze imported design" gate), `src/views/EditorView.vue` (only hint-pill removal
+ blank-canvas wiring), `src/composables/use-spec.ts` (read APIs only).
Implements: §4 items 1–5, §3 "No-API-key path" (`skipToDesign`), §5 rows 1–4.
Do NOT touch: `src/components/{WelcomeOverlay,TopBar,LeftSidebar,SpecPanel,DesignPanel,CodePanel}.vue`,
`packages/**`, tests.
Validation: `npx vitest run` green; dev server boots; `pipeline-workflow.spec.ts` passes.

### Slice C (coder 2) — shell UX + Dev code view
Owns: `src/views/EditorView.vue`, `src/components/{WelcomeOverlay,TopBar,PropertiesPanel,
LeftSidebar,DesignPanel,CodePanel,SpecPanel,NextStepCard,PipelinePhaseStepper}.vue`,
`src/components/chat/ChatPanel.vue` (empty states only), `src/stores/code-output.ts` (new),
`packages/core/src/tools/export-code.ts` (listener hook only), `src/app.css` (tokens).
Deletes §5 orphan files. Implements §3 (TopBar, right panel views, left rail, welcome
overlay, phase auto-open, Code view), §5 DesignPanel sections, §6 visual rules.
Depends on Slice B merged. Validation: `npx vitest run` green; dev server boots clean
(no console errors); `redesign-layout.spec.ts` updated for the new layout and passing;
screenshots of all four phases attached to the report.

### Slice E (coder 3) — tests
Owns: `vitest.config.ts`, `tests/**`, `src/__tests__/**`.
E1: make `tests/engine` (54 files, `bun:test` imports) run under vitest via an alias shim
(`tests/helpers/bun-test-shim.ts` re-exporting from `vitest`; exclude the ~6 files using
`Bun.*` APIs or `bun` subprocess — list them in the shim header). Widen vitest include.
E2: new unit tests — pipeline validators, `skipToDesign`, prompt injection (idea/spec
context present in built prompt), code-output store listener.
E3: update e2e for the new shell; add `tests/e2e/happy-path.spec.ts`: welcome → blank
canvas skip → design chrome → select → design panel sections visible → export view opens;
and provider-setup simplified render.
E4: full `npx playwright test --project=lutris` green (excluding figma project).
Depends on Slice C merged.

## 9. Definition of done (R10)

1. Editor boots with zero console errors; every phase reachable without an API key.
2. A 小白 user can: describe idea → get spec → see design on canvas → open code — with
   exactly one obvious action at each step.
3. `npx vitest run` (incl. engine suite) green; full e2e green; build issue documented.
4. No dead buttons, no orphan components, no mixed-language UI.
