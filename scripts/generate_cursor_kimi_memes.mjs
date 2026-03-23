import fs from 'fs';
import path from 'path';
import { google } from '@ai-sdk/google';
import { experimental_generateImage as generateImage } from 'ai';

const outDir = 'C:/Users/admin/.openclaw/workspace/projects/xhs-autopilot/output/cursor-kimi-memes';
fs.mkdirSync(outDir, { recursive: true });

const prompts = [
  {
    name: '01-cursor-underpants',
    prompt: `中文互联网黑色幽默 meme 图，竖版3:4，小红书风格。画面是一个穿着华丽西装、胸前写着“Cursor Composer 2 自研模型”的科技公司高管，正站在聚光灯下摆出很牛的发布姿势；但背后被一只手猛地扯掉裤子，露出底裤上大字写着“Kimi 2.5”。周围观众一半震惊一半憋笑，气氛又尴尬又荒诞。画面上方大字标题：偷偷用 Kimi，还敢吹自研？ 底部小字吐槽：500 亿估值，结果模型名都懒得改。风格辛辣、讽刺、夸张、传播感强。`
  },
  {
    name: '02-gatsby-cursor',
    prompt: `中文高级讽刺 meme 漫画，竖版3:4。画面左边是一个打扮体面的“Cursor”拟人角色，在豪华派对上举着香槟，胸牌写着“前沿 AI 实验室 / 自研模型”；右边聚光灯下，一个放大镜照在他的名牌和裤兜里露出的模型标签“Kimi 2.5”。背景是一群投资人先崇拜后表情凝固。整体像现代版盖茨比讽刺漫画，互联网金融泡沫感、精英派对感、黑色幽默。画面文字：上方标题：你以为他是 AI 实验室  下方文案：结果只是个会包装别人模型的产品团队。`
  }
];

for (const item of prompts) {
  console.log(`Generating ${item.name}...`);
  const result = await generateImage({
    model: google.image('gemini-3-pro-image-preview', { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
    prompt: item.prompt,
    providerOptions: { google: { aspectRatio: '3:4' } }
  });

  const image = result.images?.[0];
  if (!image) throw new Error(`No image returned for ${item.name}`);
  const base64 = image.base64 ?? (image.uint8Array ? Buffer.from(image.uint8Array).toString('base64') : null);
  if (!base64) throw new Error(`Unsupported image payload for ${item.name}`);

  const filePath = path.join(outDir, `${item.name}.png`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  console.log(`Saved: ${filePath}`);
}

console.log('All meme images generated.');