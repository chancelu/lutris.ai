# R11 — Design System "Warm Craft" (Lovart-grade restraint)

> Single source of truth for the R11 visual upgrade. Goal: one coherent premium
> identity across dark + light, calm surfaces, color used sparingly.
> Reference: Lovart — neutral-first, hairline borders, generous whitespace, small type.

## 1. Brand problem being fixed

- Loader + light theme: warm cream + deep eucalyptus green `#3B7A6B` (the real brand).
- Dark theme (default): neutral grays + generic tech blue `#5b9cf6` (off-brand).
- Hardcoded Tailwind blues (`bg-blue-600`, `text-blue-400`, `border-blue-500`) scattered
  in ExportPanel / ProductDocPanel / SpecPanel / ExportSection / toast.
- `bg-accent text-white` (15 usages) breaks once accent becomes a light sage.

R11 unifies on **warm neutrals + one eucalyptus accent** in both themes.

## 2. Tokens (`src/app.css` `@theme`)

Dark (default) — warm charcoal:

| token | value | use |
|---|---|---|
| `--color-canvas` | `#171512` | app backdrop behind canvas |
| `--color-panel` | `#1F1C18` | panels, topbar, popovers |
| `--color-inset` | `#1A1713` | sunken areas, stepper track |
| `--color-input` | `#1F1C18` | input backgrounds |
| `--color-border` | `#2E2A23` | hairlines (usually at /30–/40 opacity) |
| `--color-hover` | `#2B2721` | hover fills, user chat bubble |
| `--color-surface` | `#EDE8DF` | primary text (warm off-white) |
| `--color-muted` | `#9D9489` | secondary text/icons |
| `--color-accent` | `#7FBFA1` | eucalyptus sage — indication only |
| `--color-on-accent` | `#132219` | text/icons on accent fills |

Light — warm cream (unchanged values, plus `--color-on-accent: #FFFFFF`):

`panel #FBF8F3 · canvas #F5F1EB · border #E8E0D4 · hover #F0EBE3 · accent #3B7A6B · surface #2D2A26 · muted #8B7E6A · input #FBF8F3 · inset #F0EBE3`

## 3. Color roles (the rules that matter)

1. **Primary action** (max one per view): inverted neutral — `bg-surface text-panel hover:bg-surface/90`.
  Welcome CTA, chat send, Connect, NextStep CTA, Export Frame, Save/Write buttons.
2. **Accent = indication, not decoration**: active phase pill, active panel tab,
  active tool (`bg-accent text-on-accent`), links, focus rings, the "Analyze" chip.
  Never large filled areas with white text.
3. **AI actions** may use accent fill with `text-on-accent` (e.g. "Edit with AI").
4. **Status colors** (red/amber/green Tailwind palette) stay for errors/warnings/success only.
5. **No hardcoded `blue-*`/`sky-*`/`indigo-*` classes anywhere in `src/`.**
6. Borders: `border-border/30` hairlines; popovers `border-border/40`; never `border-white/10`.

## 4. Typography & shape

- Body 13px base (unchanged); secondary 11–12px `text-muted`; headings `tracking-tight`.
- Radius: pills `rounded-full`; buttons `rounded-lg`; cards/popovers/bubbles `rounded-xl`/`rounded-2xl`.
- Chat: user message = right-aligned `bg-hover` bubble; assistant = plain text, no bubble.

## 5. Motion

- Entrance: `animate-in fade-in slide-in-from-bottom-1 duration-300` on chat messages,
  NextStepCard; welcome content `slide-in-from-bottom-2 duration-500`.
- Hovers: `transition-colors duration-150`; no scale > 1.05.
- Focus: global `:focus-visible` accent ring on buttons/links (inputs keep own focus styles).

## 6. Non-goals

- No layout/IA changes (R10 structure stays). No new dependencies.
- No canvas/Skia internals, no `EditorCanvas.vue` HUD restyle.
- No logic changes — class-level edits only, keep all `data-test-id`s.
