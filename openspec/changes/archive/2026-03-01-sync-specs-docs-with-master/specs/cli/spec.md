## ADDED Requirements

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

## MODIFIED Requirements

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
- **`lutris eval <file>` — execute JavaScript with Figma Plugin API (NEW)**

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
