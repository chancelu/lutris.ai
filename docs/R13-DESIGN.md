# R13 "Deep Space" 设计语言

R12 "Atelier"（暖黑+香槟铜+衬线）被否决：用户评价"像 20 年前的产品"。R13 目标：**科技感 + 高级**，保留水獭吉祥物（重新绘制为几何 SVG mark)。

## 调研结论（review-r13/ 截图）

- **Raycast**：深色底 + 单一高饱和品牌色光晕，高级感来自"克制的色彩 + 光"。
- **Vercel**：几何、极简、 tight tracking 的无衬线大字标。
- **Linear**（无法直连，按既有认知）：冷调蓝黑 #0D0E13、1px rgba 白边、Indigo #5E6AD2。
- **v0**：AI 产品的核心是一个"被聚焦的输入框"——入口即产品。

共同语言：冷调深色、玻璃质感（半透明+发丝边+blur）、电光 accent（indigo→cyan）、几何无衬线、光（glow）只给最重要的元素。

## R13 语言

- **底色**：深空蓝黑 canvas `#07090F` / panel `#0C0F16`，拒绝纯黑与暖黑。
- **材质**：玻璃——面板 `white/3-5%` 填充 + `white/6-10%` 1px 边 + backdrop-blur。
- **Accent**：电光靛 `#6E7BFF`，副色青 `#22D3EE`；渐变 `135deg #6E7BFF → #22D3EE` 只用于主 CTA、激活态、mark。
- **光**：主 CTA 与激活阶段带 accent 光晕（box-shadow accent/25-35%）。
- **字体**：弃用衬线。`--font-display` 重定义为几何无衬线栈（Inter → SF → PingFang SC → MiSans → Microsoft YaHei)，标题用 600 weight + `-0.02em` tracking。
- **圆角**：卡片 12-16px，按钮 pill。
- **吉祥物**：水獭重绘为几何 SVG mark——圆角方块渐变底 + 极简白色水獭脸线条（OtterMark.vue)，用于 TopBar、欢迎页、空态。
- **动效**：150-200ms ease，hover 微浮起，不加花哨动画。

## 原则

- accent 只表示"激活/主操作/AI"，大面积背景永远中性。
- 科技感来自"冷色 + 光 + 玻璃 + 几何"，不是堆渐变和发光字。
