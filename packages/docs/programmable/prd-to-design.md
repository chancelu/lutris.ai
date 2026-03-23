# PRD to Design

Lutris.ai can import product requirement documents and transform them into structured design specs and visual layouts.

## Supported Formats

- **Markdown** (.md)
- **Plain Text** (.txt)
- **Word Documents** (.docx) — via mammoth.js

## Workflow

### 1. Import or Write

Open the **Product Doc** tab in the right panel:

- **Import File** — Upload a .md, .txt, or .docx file
- **Write** — Create a document directly in the editor

### 2. AI Parse

Click **AI Parse** to analyze your document. The AI extracts:

- Problem Statement
- User Personas
- User Stories (grouped by feature)
- Feature Requirements (P0/P1/P2 priority)
- Success Metrics
- Technical Constraints
- Open Questions

### 3. Sync to Design

Click **Sync to Design** to push the parsed structure to the canvas. The AI generates:

- Screen frames based on page structure
- Component hierarchy from feature requirements
- Design tokens from specified colors, fonts, and spacing

### 4. Iterate with AI Chat

Switch to **AI Chat** and refine:

```
Add a settings screen based on the user preferences section
```

```
Change the primary color to match the brand guidelines in the PRD
```

## Version Management

The Product Doc panel tracks versions automatically. Each save creates a new version you can browse and restore.

## Bidirectional Sync

Changes on the canvas can sync back to the document, and vice versa. The `syncSource` flag prevents infinite loops — the canvas is always the source of truth.
