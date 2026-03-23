import fs from 'fs';
import path from 'path';
import { google } from '@ai-sdk/google';
import { experimental_generateImage as generateImage } from 'ai';

const outDir = 'C:/Users/admin/.openclaw/workspace/projects/xhs-autopilot/output/middle-management-comics';
fs.mkdirSync(outDir, { recursive: true });

const prompts = [
  {
    name: '01-cover',
    prompt: `一张中文小红书漫画封面，竖版3:4，赛博职场讽刺漫画风。主角是一个穿衬衫的中层经理，被夹在老板、程序员、设计、运营之间，四面八方飞来飞书消息、会议纪要、排期表、PPT、红色感叹号。经理表情崩溃流汗。背景是冷色办公室和数据面板。画面上方有醒目的中文标题：AI开始吃中层了，不只是基层。整体风格高级、辛辣、互联网职场黑色幽默、适合小红书爆款封面。`
  },
  {
    name: '02-human-glue',
    prompt: `中文讽刺漫画，竖版3:4，小红书卡片风。一个中层PM像胶水怪一样被粘在老板、程序员、设计师、运营中间，四个人都在冲他喊话，气泡文字分别是“进度呢？”“需求又变了？”“到底改哪版？”“今天能不能上线？”。中间人物左手拿会议纪要，右手拿排期表，手机里全是未读消息，表情又累又麻。画面底部有中文文案：很多中层的价值，不是判断，是当组织里的人肉胶水。构图清晰，夸张有故事感。`
  },
  {
    name: '03-ai-does-the-dirty-work',
    prompt: `中文漫画插画，竖版3:4，办公室场景。一个西装AI机器人坐在工位前高速处理任务：自动写会议纪要、拆任务、做周报、总结聊天记录、跟踪进度，屏幕上飞出文档和图表。旁边一个中层经理震惊地看着，表情像在说“这不都是我平时干的吗”。画面有强烈对比感，底部中文文案：AI不一定先替代你的职位，但会先替代你岗位里最容易被压缩的脏活。风格像高级互联网职场漫画，略带黑色幽默。`
  },
  {
    name: '04-5people-to-2plusai',
    prompt: `中文信息讽刺漫画，竖版3:4，左右对比构图。左边是5个上班族在混乱办公室里传话、递纸条、开会、发消息，流程极其繁琐，头顶写着Before。右边是2个人加一个巨大的AI屏幕在高效工作，流程干净利落，头顶写着After。视觉上形成鲜明反差。底部中文文案：以前要5个人转来转去的流程，现在2个人加一套AI工作流也能跑。未来感、职场感、清晰易懂。`
  },
  {
    name: '05-ai-audits-you',
    prompt: `中文黑色幽默漫画，竖版3:4。一个PM坐在电脑前一本正经地说“我主要负责推进和协调”。对面坐着一个冷脸AI审计员，戴眼镜，像审计官一样翻着文件，气泡冷冷地回一句：“翻译一下：催人、写纪要、做同步、汇报状态？”。PM瞳孔地震。背景是压迫感很强的会议室和红色审计灯光。底部中文文案：如果你的核心工作还是催人、写纪要、做同步，那AI不是来辅助你的，是来审计你的。辛辣、荒诞、适合传播。`
  },
  {
    name: '06-real-value-is-decision',
    prompt: `中文职场漫画，竖版3:4，左右分镜构图。左边一个人抱着流程图、会议纪要、周报、PPT，自我感觉良好，身上贴满“流程”“同步”“汇报”标签。右边一个真正的负责人站在岔路口前，背后是团队，前方两条路都可能出事，他神情坚定地说“这条路我拍板，错了算我的”。背后有强烈戏剧性灯光。底部中文文案：AI先抽干的是流程型价值，真正越来越贵的是判断、取舍、拍板和背锅。成熟、冷峻、有力量感。`
  }
];

for (const item of prompts) {
  console.log(`Generating ${item.name}...`);
  const result = await generateImage({
    model: google.image('gemini-3-pro-image-preview'),
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

console.log('All images generated.');