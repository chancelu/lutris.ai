---
title: Exporting
description: Render .fig files to PNG, JPG, WEBP, SVG, or JSX with Tailwind classes.
---

# Exporting

Export designs from the terminal — raster images, vectors, or JSX code.

## Image Export

```sh
designflow export design.fig                          # PNG (default)
designflow export design.fig -f jpg -s 2 -q 90       # JPG at 2×, quality 90
designflow export design.fig -f webp -s 3             # WEBP at 3×
designflow export design.fig -f svg                   # SVG vector
```

Options:

- `-f` — format: `png`, `jpg`, `webp`, `svg`, `jsx`
- `-s` — scale: `1`–`4`
- `-q` — quality: `0`–`100` (JPG/WEBP only)
- `-o` — output path
- `--page` — page name
- `--node` — specific node ID

## JSX Export

Export as JSX with Tailwind utility classes:

```sh
designflow export design.fig -f jsx --style tailwind
```

Output:

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

Also supports `--style designflow` for the native JSX format (see [JSX Renderer](../jsx-renderer)).

## Thumbnails

```sh
designflow export design.fig --thumbnail --width 1920 --height 1080
```

## Live App Mode

Omit the file to export from the running app:

```sh
designflow export -f png    # screenshot the current canvas
```
