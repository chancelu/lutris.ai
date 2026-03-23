---
title: Inspecting Files
description: Browse node trees, search by name or type, and dig into properties from the terminal.
---

# Inspecting Files

The CLI lets you explore `.fig` files without opening the editor. Every command also works on the live app — just omit the file argument.

::: tip Install
```sh
bun add -g @open-pencil/cli
# or
brew install open-pencil/tap/lutris
```
:::

## Document Info

Get a quick overview — page count, total nodes, fonts used, file size:

```sh
lutris info design.fig
```

## Node Tree

Print the full node hierarchy:

```sh
lutris tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Find Nodes

Search by type:

```sh
lutris find design.fig --type TEXT
```

Search by name:

```sh
lutris find design.fig --name "Button"
```

Both flags can be combined to narrow results further.

## Query with XPath

Use XPath selectors to find nodes by type, attributes, and tree structure:

```sh
lutris query design.fig "//FRAME"
```

### Useful patterns

**By type:**

```sh
lutris query design.fig "//TEXT"                    # All text nodes
lutris query design.fig "//COMPONENT"               # All components
lutris query design.fig "//INSTANCE"                # All instances
```

**By attributes:**

```sh
lutris query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
lutris query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
lutris query design.fig "//*[@visible = false]"                # Hidden nodes
lutris query design.fig "//TEXT[@fontSize >= 24]"              # Large text
lutris query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**By name and text content:**

```sh
lutris query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
lutris query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**By hierarchy:**

```sh
lutris query design.fig "//SECTION//TEXT"            # Text inside sections
lutris query design.fig "//FRAME/TEXT"               # Direct text children of frames
lutris query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Queryable attributes

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Example output

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Node Details

Inspect all properties of a specific node by its ID:

```sh
lutris node design.fig --id 1:23
```

## Pages

List all pages in the document:

```sh
lutris pages design.fig
```

## Variables

List design variables and their collections:

```sh
lutris variables design.fig
```

## Live App Mode

When the desktop app is running, omit the file argument — the CLI connects via RPC and operates on the live canvas:

```sh
lutris tree              # inspect the live document
lutris eval -c "..."     # query the editor
```

## JSON Output

All commands support `--json` for machine-readable output — pipe into `jq`, feed to CI scripts, or process with other tools:

```sh
lutris tree design.fig --json | jq '.[] | .name'
```
