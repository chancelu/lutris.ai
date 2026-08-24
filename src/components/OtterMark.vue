<script setup lang="ts">
// R13 品牌 mark：水獭吉祥物重绘——圆角方块渐变底（电光靛→青）+ 极简白色水獭脸。
// plain 模式去掉底板，仅保留水獭脸（currentColor），用于内联小尺寸场景。
const { size = 20, plain = false } = defineProps<{
  size?: number
  plain?: boolean
}>()

const gid = `otter-g-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    aria-label="Lutris otter"
    role="img"
    class="shrink-0"
  >
    <defs>
      <linearGradient :id="gid" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#6E7BFF" />
        <stop offset="1" stop-color="#22D3EE" />
      </linearGradient>
    </defs>
    <rect v-if="!plain" x="2" y="2" width="44" height="44" rx="13" :fill="`url(#${gid})`" />
    <!-- 水獭脸：双耳 + 圆头 -->
    <g :fill="plain ? 'currentColor' : '#FFFFFF'">
      <circle cx="16.2" cy="16.8" r="4.4" />
      <circle cx="31.8" cy="16.8" r="4.4" />
      <path
        d="M24 18.6c-6.9 0-11.4 4.8-11.4 10.7 0 5.6 4.6 9.4 11.4 9.4s11.4-3.8 11.4-9.4c0-5.9-4.5-10.7-11.4-10.7z"
      />
    </g>
    <!-- 五官：底板色反白（plain 模式用透明镂空） -->
    <g :fill="plain ? 'transparent' : `url(#${gid})`">
      <circle cx="19.6" cy="26.6" r="1.8" />
      <circle cx="28.4" cy="26.6" r="1.8" />
      <path
        d="M24 30c-1.7 0-2.9 1.1-2.9 2.3 0 1.6 1.8 3 2.9 3s2.9-1.4 2.9-3c0-1.2-1.2-2.3-2.9-2.3z"
      />
    </g>
    <g v-if="plain" fill="var(--color-panel)">
      <circle cx="19.6" cy="26.6" r="1.8" />
      <circle cx="28.4" cy="26.6" r="1.8" />
      <path
        d="M24 30c-1.7 0-2.9 1.1-2.9 2.3 0 1.6 1.8 3 2.9 3s2.9-1.4 2.9-3c0-1.2-1.2-2.3-2.9-2.3z"
      />
    </g>
  </svg>
</template>
