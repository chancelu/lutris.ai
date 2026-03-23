# cli Specification (delta — new spec domain)

## Purpose
Headless CLI for .fig file operations. Runs in Bun/Node without a GUI, using CanvasKit CPU rasterization for rendering.

## New Requirements

### Requirement: CLI package
@open-pencil/cli SHALL be a separate package in packages/cli/ providing headless .fig file operations. It imports @open-pencil/core for engine access and uses CanvasKit CPU rasterization for rendering without WebGL.

### Requirement: CLI commands
The CLI SHALL support the following commands:
- `lutris info <file>` — document stats, node type counts, font list
- `lutris tree <file>` — visual node tree with formatted output
- `lutris find <file>` — search nodes by name or type
- `lutris export <file>` — render to PNG/JPG/WEBP at any scale

All commands SHALL support `--json` for machine-readable output.

#### Scenario: Info command
- **WHEN** `bun lutris info design.fig` is run
- **THEN** document stats, node type counts, and font list are printed

#### Scenario: Export command
- **WHEN** `bun lutris export design.fig --format png --scale 2` is run
- **THEN** the document is rendered headlessly and exported as 2× PNG

#### Scenario: JSON output
- **WHEN** `bun lutris tree design.fig --json` is run
- **THEN** the node tree is output as JSON

### Requirement: Workspace integration
The CLI SHALL be runnable via `bun lutris` within the Bun workspace, without global installation.

#### Scenario: Run from workspace root
- **WHEN** `bun lutris info design.fig` is run from the project root
- **THEN** the CLI executes using the workspace-linked binary
