import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'

import { Button } from './Button'
import { Spinner } from './Spinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
  /**
   * Where focus goes when the dialog closes. By default it returns to the element focused when
   * it opened, which may be gone (e.g. a menu item, or the row of a deleted book).
   */
  returnFocusTo?: () => HTMLElement | null | undefined
}

/**
 * Confirmation for destructive actions. Unlike a regular dialog, it does not close on an
 * outside click, and focus starts on Cancel so an absent-minded Enter does not confirm.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  onCancel,
  returnFocusTo,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && !isPending && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 grid place-items-center overflow-y-auto bg-scrim p-4 motion-safe:animate-fade-in">
          <AlertDialog.Content
            onCloseAutoFocus={(event) => {
              const target = returnFocusTo?.()
              if (target) {
                event.preventDefault()
                target.focus()
              }
            }}
            className="flex w-full max-w-md flex-col gap-3.5 rounded-md border border-line bg-surface p-6 shadow-[0_20px_48px_rgb(20_18_15/0.22)] focus:outline-none"
          >
            <AlertDialog.Title className="text-xl font-bold tracking-tight">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-muted">{description}</AlertDialog.Description>
            <div className="flex justify-end gap-2.5 pt-1.5">
              <AlertDialog.Cancel asChild>
                <Button disabled={isPending}>Cancelar</Button>
              </AlertDialog.Cancel>
              {/* Not AlertDialog.Action: that would close the dialog before the request ends. */}
              <Button variant="danger" onClick={onConfirm} disabled={isPending}>
                {isPending && <Spinner />}
                {isPending ? pendingLabel : confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
