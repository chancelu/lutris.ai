/**
 * Emoji detection and mapping to built-in vector icons.
 * Used by the JSX renderer to replace emoji characters with vector icons.
 */
import { ICONS } from '../tools/icons'
import type { VectorNetwork } from '../scene-graph'

const EMOJI_RE = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu

export function stripEmoji(text: string): string {
  return text.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim()
}

function isPureEmoji(text: string): boolean {
  const stripped = text.replace(EMOJI_RE, '').replace(/[\s\uFE0F\u200D]/g, '')
  return stripped.length === 0 && text.trim().length > 0
}

const EMOJI_ICON_MAP: Record<string, string> = {
  '🔍': 'search', '🔎': 'search',
  '⚙️': 'settings', '⚙': 'settings',
  '🔔': 'bell', '🔕': 'bell',
  '👤': 'user', '👥': 'users',
  '❤️': 'heart', '❤': 'heart',
  '⭐': 'star', '🌟': 'star',
  '✉️': 'mail', '📧': 'mail', '📩': 'mail',
  '📞': 'phone', '📱': 'phone',
  '📅': 'calendar', '📆': 'calendar',
  '🕐': 'clock', '⏰': 'clock',
  '🖼️': 'image', '📷': 'camera', '📸': 'camera',
  '▶️': 'play', '⏸️': 'pause',
  '📄': 'file', '📁': 'folder', '📂': 'folder',
  '⬇️': 'download', '⬆️': 'upload',
  '🗑️': 'trash', '🗑': 'trash',
  '📋': 'copy',
  '💬': 'message-circle',
  '📤': 'send', '🔗': 'link',
  '⚠️': 'alert-circle',
  '✅': 'check-circle',
  'ℹ️': 'info',
  '👁️': 'eye', '👀': 'eye',
  '🏠': 'home', '🏡': 'home',
  '✏️': 'edit', '📝': 'edit',
  '➕': 'plus', '➖': 'minus', '❌': 'x',
  '✔️': 'check',
  '🔄': 'refresh',
  '⚡': 'zap', '⚡️': 'zap',
  '🌐': 'globe', '🌍': 'globe',
  '🚪': 'log-out',
  '↗️': 'external-link',
}

export function emojiToIconName(text: string): string | null {
  if (!isPureEmoji(text)) return null
  return EMOJI_ICON_MAP[text] ?? null
}

export function getIconNetwork(name: string): VectorNetwork | null {
  return ICONS[name] ?? null
}
