# AI Image Generation

Lutris.ai integrates Google's Gemini AI for generating images directly on your canvas.

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Go to **Brand Settings** tab (right panel)
3. Paste your key in the **Gemini API Key** field

Or set `VITE_GEMINI_API_KEY` in your `.env.local` file.

## Usage

### Via AI Chat

Open the **AI Chat** tab and describe the image you want:

```
Generate a hero image for a todo app with a blue gradient background
```

```
Create an icon set: checkmark, trash, edit, star — flat design, blue theme
```

The AI will use the `generate_image` tool to create the image and place it on your canvas.

### Parameters

The `generate_image` tool accepts:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | required | Description of the image |
| `width` | number | 512 | Width in pixels |
| `height` | number | 512 | Height in pixels |
| `x` | number | 100 | X position on canvas |
| `y` | number | 100 | Y position on canvas |

## Model

Lutris.ai uses `gemini-2.5-flash-image` by default, which supports both text and image generation in a single response.

## Tips

- Be specific about style: "flat design", "3D render", "watercolor", "pixel art"
- Specify dimensions when you need a particular aspect ratio
- The generated image is inserted as a rectangle node with an image fill
- You can resize, move, and layer the image like any other node
