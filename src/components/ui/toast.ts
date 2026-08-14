import { twMerge } from 'tailwind-merge'
import { tv } from 'tailwind-variants'

import type { ToastVariant } from '@/composables/use-toast'

const toast = tv({
  base: 'flex max-w-sm items-start gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-1 data-[swipe=cancel]:translate-y-0 data-[swipe=cancel]:transition-transform data-[swipe=move]:translate-y-[var(--reka-toast-swipe-move-y)]',
  variants: {
    tone: {
      default: 'border-border bg-surface text-panel',
      warning: 'border-transparent bg-amber-600 text-white',
      error: 'border-transparent bg-red-600 text-white'
    }
  },
  defaultVariants: { tone: 'default' }
})

export function toastRoot(options?: { tone?: ToastVariant; class?: string }) {
  return twMerge(toast(options), options?.class)
}
