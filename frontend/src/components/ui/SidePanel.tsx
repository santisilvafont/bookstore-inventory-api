import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

import { ignoreToastInteractions } from './dialog'

interface SidePanelProps {
  title: ReactNode
  eyebrow?: ReactNode
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * A dialog that slides in from the right. Radix handles the accessibility: focus is trapped
 * inside and restored on close, Escape and clicking outside close it, and it is announced as a
 * dialog named by its title.
 */
export function SidePanel({ title, eyebrow, footer, onClose, children }: SidePanelProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-scrim motion-safe:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          onInteractOutside={ignoreToastInteractions}
          className="fixed inset-y-0 right-0 flex w-full max-w-120 flex-col border-l border-line bg-surface shadow-[-12px_0_32px_rgb(20_18_15/0.14)] focus:outline-none motion-safe:animate-panel-in"
        >
          <div className="flex items-center justify-between gap-4 px-7 pt-5">
            <p className="text-muted">{eyebrow}</p>
            <Dialog.Close
              aria-label="Cerrar"
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded text-muted hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-4.5" fill="none" aria-hidden="true">
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Dialog.Close>
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-7 pt-2 pb-6">
            <Dialog.Title className="text-[28px] leading-tight font-bold tracking-tight">
              {title}
            </Dialog.Title>
            {children}
          </div>
          {footer && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-7 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
