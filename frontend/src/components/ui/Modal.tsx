import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

import { ignoreToastInteractions } from './dialog'

interface ModalProps {
  title: string
  description?: string
  /** While true (e.g. saving), Escape, the close button and outside clicks do nothing. */
  preventClose?: boolean
  onClose: () => void
  children: ReactNode
}

/** A centered dialog. Like SidePanel, Radix handles focus, Escape and screen-reader semantics. */
export function Modal({ title, description, preventClose = false, onClose, children }: ModalProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !preventClose && onClose()}>
      <Dialog.Portal>
        {/* The overlay is the scroll container, so a dialog taller than the screen can scroll. */}
        <Dialog.Overlay className="fixed inset-0 grid place-items-start overflow-y-auto bg-scrim p-4 motion-safe:animate-fade-in sm:place-items-center sm:p-10">
          <Dialog.Content
            // Without a description, an explicit undefined tells Radix there is none on purpose.
            {...(!description && { 'aria-describedby': undefined })}
            onInteractOutside={ignoreToastInteractions}
            className="flex w-full max-w-160 flex-col justify-self-center rounded-md border border-line bg-surface shadow-[0_20px_48px_rgb(20_18_15/0.22)] focus:outline-none"
          >
            <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-2">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="text-2xl font-bold tracking-tight">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="text-muted">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Cerrar"
                disabled={preventClose}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
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
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
