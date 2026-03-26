# Lutris.ai Information Architecture & AI Workflow Iteration PRD

## Document Info
- **Project**: Lutris.ai
- **Initiative**: Information Architecture & AI Workflow Iteration
- **Status**: Draft
- **Date**: 2026-03-24
- **Owner**: 小北 / 小香

## 1. Summary
Lutris.ai already has strong technical foundations and differentiated capabilities, but the product currently presents itself as a collection of powerful modules rather than a clear workflow. This iteration focuses on tightening the product story, simplifying the editor information architecture, clarifying AI capability states, and redefining PRD as a structured spec layer instead of a generic text bucket.

This iteration does **not** aim to add major new features. It aims to make the existing product easier to understand, easier to start using, and more trustworthy in how it communicates AI behavior.

## 2. Problem Statement
Users face three major issues today:

1. **Homepage value expression is fragmented**  
   Multiple product strengths compete for attention at once: `.fig` support, AI chat, MCP, collaboration, desktop/PWA, export, code, and programmability. Users do not immediately understand the core promise.

2. **Editor information architecture is organized by modules, not by tasks**  
   The right panel currently behaves like a toolbox. It exposes many capabilities, but it does not guide users through a clear workflow from idea to design to delivery.

3. **AI behavior is not transparent enough**  
   Depending on provider/model configuration, AI may be able to chat but not reliably perform tool-based actions. This creates a trust gap between what users expect and what the product can actually do.

4. **PRD is directionally correct but structurally weak**  
   The PRD area is valuable as a product thinking layer, but in its current form it behaves too much like a markdown scratchpad or a chat transcript sink.

## 3. Goals
### Primary Goals
- Help users understand Lutris.ai’s value proposition within **5 seconds**.
- Help first-time users complete a meaningful first action within **30 seconds**.
- Make AI capability state explicit: users should know whether AI is in **action mode**, **chat-only mode**, or **not configured**.
- Turn PRD into a **structured spec layer** that supports generation, alignment, and delivery.

### Success Criteria
- Higher click-through on primary homepage CTAs.
- Improved first-session activation in the editor.
- Reduced provider-configuration confusion and AI-related failure ambiguity.
- Increased usage of structured PRD flows instead of raw text dumping.

## 4. Non-Goals
- Rebuilding the rendering engine, file format stack, or collaboration engine.
- Introducing large new AI feature sets.
- Reworking MCP, CLI, or deep developer workflows in this iteration.
- Performing a full visual redesign across every surface.

## 5. Target Users
### Primary Users
- **PMs / founders**: want to go from rough idea or PRD to editable UI quickly.
- **Designers / AI-native builders**: want to import `.fig`, iterate visually, and ship outputs fast.
- **Developers / agent users**: care about programmability, but are not the first homepage audience.

### Core Use Cases
- Start from a prompt and generate an initial UI concept.
- Import an existing design and iterate with AI or manually.
- Start from a PRD or product notes and turn them into design direction.
- Export assets, code, or handoff materials after editing.

## 6. Product Positioning
### One-line Positioning
**Lutris.ai helps users go from prompt or PRD to editable design and handoff.**

### Core Workflow
**Start → Create → Spec → Ship**

### Product Principles
- Show users a workflow, not a pile of tools.
- Make AI capability state explicit at all times.
- Treat PRD as structured product memory, not a generic text dump.
- Let the homepage sell outcomes; let the editor guide execution.

## 7. Solution Overview
This iteration includes five coordinated changes:

1. **Homepage repositioning**
2. **Editor information architecture redesign**
3. **AI + PRD relationship redesign**
4. **AI capability transparency**
5. **First-run and key path refinement**

## 8. Detailed Proposal
### 8.1 Homepage Repositioning
#### Objective
Reduce cognitive overload and make the core promise obvious immediately.

#### Proposed Information Hierarchy
1. Hero
2. Three core value pillars
3. Three start paths
4. Product preview
5. Deep capabilities (MCP / CLI / collaboration)

#### Hero Content
- **Headline**: `Turn prompts and PRDs into editable UI`
- **Subheadline**: `Create, edit, and ship interfaces from ideas, specs, or .fig files — with AI when you want it, and full control when you don’t.`
- **Primary CTA**: `Try Demo`
- **Secondary CTA**: `Open Editor`
- **Tertiary CTA**: `Import .fig`

#### Core Value Pillars
- **Open existing work** — Import `.fig` files and keep designing without starting over.
- **Create with AI** — Go from prompt or product spec to editable interface, not static mockups.
- **Ship the outcome** — Export assets, generate handoff, and move faster into delivery.

#### Start Paths
- `Start from prompt`
- `Import .fig`
- `Write or import PRD`

### 8.2 Editor Information Architecture Redesign
#### Objective
Replace module-first navigation with stage-based workflow guidance.

#### Current State
The right panel mixes AI chat, PRD, code, export, handoff, and brand tools in a way that feels dense and multi-threaded.

#### Proposed State
Right panel top-level navigation becomes:
- `Create`
- `Spec`
- `Ship`

#### Panel Definitions
- **Create**
  - AI Chat
  - Brand controls
  - Prompt templates
  - Recent actions
- **Spec**
  - PRD Summary
  - Requirements
  - Versions
- **Ship**
  - Code
  - Handoff
  - Export

#### Interaction Principles
- Only one primary work context is visible by default.
- Secondary controls appear inside that context instead of as always-on parallel panes.
- New users default to `Create`.
- Design-to-spec sync routes users into `Spec` with a visible change summary.

### 8.3 AI and PRD Relationship Redesign
#### Objective
Keep AI and PRD connected, but stop making them feel like equal competing entry points.

#### Proposed Model
- **AI** is the action interface.
- **PRD** is the structured memory/spec layer.

#### Key Changes
- Replace generic `Import to PRD` behavior with structured save actions:
  - `Save summary`
  - `Save requirements`
  - `Create spec draft`
- Organize PRD around:
  - `Summary`
  - `Requirements`
  - `Versions`
- For design → PRD sync, show:
  - What changed
  - Why it matters
  - Save to spec

#### Product Decision
AI and PRD should remain linked, but move from **strong side-by-side coupling** to **weak workflow coupling**.

### 8.4 AI Capability Transparency
#### Objective
Close the trust gap between user expectations and actual model/provider capability.

#### AI State Model
- `Ready for actions`
- `Chat only`
- `Not configured`
- `Provider error`

#### UX Requirements
- Show capability badge inside the Create panel.
- Before any tool-requiring action, validate capability and show a clear blocking explanation if unavailable.
- Classify errors into:
  - Configuration error
  - Authentication error
  - Tool unsupported
  - Generation failed
- Pair each error with a next action:
  - Configure provider
  - Update API key
  - Switch model
  - Retry

### 8.5 First-run and Key Path Refinement
#### Objective
Help new users get to a successful first outcome quickly.

#### First-run Flow
1. Choose starting point
   - Start from prompt
   - Import `.fig`
   - Blank canvas
2. Confirm AI state
   - AI ready
   - Chat only
   - Set up provider
3. Offer guided starting prompts
   - Landing page
   - Dashboard
   - Mobile app
   - Turn PRD into UI

#### Post-import Actions
After import, suggest:
- Analyze with AI
- Generate spec summary
- Export assets

#### Post-export Actions
After export, suggest:
- Open folder
- Export another format
- Create handoff notes

## 9. Scope
### P0
- Rewrite homepage hero and core value hierarchy.
- Restructure right panel into `Create / Spec / Ship`.
- Remove persistent split-panel hierarchy on the right.
- Add AI capability badge and preflight validation for tool-required actions.
- Replace raw `Import to PRD` CTA strategy with structured PRD save actions.

### P1
- Add first-run onboarding.
- Improve empty states and post-import guidance.
- Rework PRD into `Summary / Requirements / Versions`.
- Improve export completion flows.
- Add AI error classification and recovery actions.

### P2
- Add guided sync summaries for design → spec.
- Add templates for common creation flows.
- Better position MCP/CLI/collaboration deeper in homepage.

## 10. Risks
- Over-simplifying the right panel may reduce discoverability for power users.
- AI capability messaging may expose limitations more explicitly, which can hurt perceived magic in the short term.
- PRD restructuring may require deeper data model changes than initially expected.

## 11. Open Questions
- Should `Brand` live permanently inside `Create`, or be moved to project-level settings?
- Should `Code`, `Handoff`, and `Export` remain separate inside `Ship`, or merge into a single delivery surface?
- Should PRD structured fields be fully schema-driven in this iteration, or staged across multiple releases?

## 12. Appendix: Draft UX Copy
### Homepage Hero
- **Headline**: `Turn prompts and PRDs into editable UI`
- **Subheadline**: `Create, edit, and ship interfaces from ideas, specs, or .fig files — with AI when you want it, and full control when you don’t.`
- **Buttons**: `Try Demo` / `Open Editor` / `Import .fig`

### Create Panel
- `Use AI to generate, edit, or explore interface ideas.`
- States: `AI ready for actions` / `AI available for chat only` / `AI not configured`

### Spec Panel
- `Capture product intent, requirements, and design decisions.`

### Ship Panel
- `Export what you built and prepare it for delivery.`

### Empty State
- **Title**: `Start with something simple`
- **Body**: `Use a prompt, import a design file, or bring in a product spec.`
