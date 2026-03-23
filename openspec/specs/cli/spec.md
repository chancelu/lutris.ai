# cli Specification

## Purpose
Headless CLI for .fig file operations. Runs in Bun/Node without a GUI, using CanvasKit CPU rasterization for rendering. Lives in packages/cli/ as @open-pencil/cli.

## Requirements

### Requirement: CLI package
@open-pencil/cli SHALL be a separate package in packages/cli/ providing headless .fig file operations. It imports @open-pencil/core for engine access and uses CanvasKit CPU rasterization for rendering without WebGL.

### Requirement: CLI commands
The CLI SHALL support the following commands:
- `lutris info <file>` — document stats, node type counts, font list
- `lutris tree <file>` — visual node tree with formatted output
- `lutris find <file>` — search nodes by name or type
- `lutris export <file>` — render to PNG/JPG/WEBP at any scale
- `lutris analyze colors <file>` — color palette usage with clustering
- `lutris analyze typography <file>` — font/size/weight distribution
- `lutris analyze spacing <file>` — gap/padding values with grid alignment check
- `lutris analyze clusters <file>` — repeated patterns (potential components)
- `lutris node <file> <id>` — detailed properties of a specific node
- `lutris pages <file>` — list pages with node counts
- `lutris variables <file>` — list design variables and collections
- `lutris eval <file>` — execute JavaScript with Figma Plugin API

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

#### Scenario: Eval command
- **WHEN** `bun lutris eval design.fig --code 'return figma.currentPage.children.length'` is run
- **THEN** system executes JavaScript with `figma` global and prints result

### Requirement: Workspace integration
The CLI SHALL be runnable via `bun lutris` within the Bun workspace, without global installation.

#### Scenario: Run from workspace root
- **WHEN** `bun lutris info design.fig` is run from the project root
- **THEN** the CLI executes using the workspace-linked binary

### Requirement: Analyze commands
The CLI SHALL provide `lutris analyze <file>` subcommands for design file analysis: colors (palette usage with clustering), typography (font/size/weight distribution), spacing (gap/padding values with grid check), clusters (repeated patterns that could be components).

#### Scenario: Analyze colors
- **WHEN** `bun lutris analyze colors design.fig` is run
- **THEN** a color palette summary with usage counts and clusters is printed

#### Scenario: Analyze clusters
- **WHEN** `bun lutris analyze clusters design.fig` is run
- **THEN** repeated node patterns that could be components are listed

### Requirement: Node command
The CLI SHALL provide `lutris node <file> <id>` to display detailed properties of a specific node by ID.

#### Scenario: Node details
- **WHEN** `bun lutris node design.fig abc123` is run
- **THEN** the node's type, properties, children, and parent are displayed

### Requirement: Pages command
The CLI SHALL provide `lutris pages <file>` to list all pages with node counts.

#### Scenario: List pages
- **WHEN** `bun lutris pages design.fig` is run
- **THEN** each page name and its node count are listed

### Requirement: Variables command
The CLI SHALL provide `lutris variables <file>` to list design variables and collections.

#### Scenario: List variables
- **WHEN** `bun lutris variables design.fig` is run
- **THEN** all variable collections, modes, and variable values are listed

### Requirement: Eval command for headless scripting

The CLI SHALL provide `lutris eval <file>` command for executing JavaScript against .fig files with a Figma-compatible `figma` global object.

#### Scenario: Inline code execution
- **WHEN** `bun lutris eval design.fig --code 'return figma.currentPage.children.length'` is run
- **THEN** system loads design.fig, executes code, and prints result

#### Scenario: Reading code from stdin
- **WHEN** `cat script.js | bun lutris eval design.fig --stdin` is run
- **THEN** system reads script from stdin and executes

#### Scenario: Writing changes back
- **WHEN** `bun lutris eval design.fig --code 'frame.name = "Updated"' --write` is run
- **THEN** system modifies design.fig in-place after execution

#### Scenario: Writing to output file
- **WHEN** `bun lutris eval design.fig --code '...' -o modified.fig` is run
- **THEN** system writes modified document to modified.fig

#### Scenario: JSON output
- **WHEN** `bun lutris eval design.fig --code '...' --json` is run
- **THEN** system formats result as JSON

#### Scenario: Figma API access
- **WHEN** eval code accesses `figma.createFrame()`, `figma.currentPage.findAll()`, etc.
- **THEN** system provides FigmaAPI instance bound to loaded document

#### Scenario: Error handling
- **WHEN** eval code throws error
- **THEN** system prints error message and stack trace to stderr
