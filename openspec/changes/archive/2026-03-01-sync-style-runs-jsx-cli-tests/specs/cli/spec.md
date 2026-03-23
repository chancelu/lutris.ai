# cli Specification (delta)

## New Requirements

### Requirement: Analyze commands
The CLI SHALL provide `lutris analyze <file>` subcommands for design file analysis:
- `analyze colors` — color palette usage with clustering
- `analyze typography` — font/size/weight distribution
- `analyze spacing` — gap/padding values with grid alignment check
- `analyze clusters` — repeated patterns that could be components

All subcommands SHALL support `--json` for machine-readable output.

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
