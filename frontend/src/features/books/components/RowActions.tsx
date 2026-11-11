import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import type { Book } from '../../../api/types'
import { CATALOG_HEADING_ID } from '../catalogParams'
import { inAppNavigationState } from '../navigation'
import { DeleteBookDialog } from './DeleteBookDialog'

const ITEM =
  'flex min-h-9 cursor-pointer items-center rounded px-3 outline-none select-none data-highlighted:bg-paper'

/** The "⋯" menu of a catalog row: open, edit or delete the book. */
export function RowActions({ book }: { book: Book }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasDeleted = useRef(false)

  const open = (pathname: string) => navigate({ pathname, search }, { state: inAppNavigationState })

  return (
    <>
      {/* Non-modal, so it hands focus and pointer events cleanly to the confirmation dialog. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          ref={triggerRef}
          aria-label={`Acciones para «${book.title}»`}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded text-muted hover:text-ink data-[state=open]:bg-paper data-[state=open]:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-10 min-w-44 rounded border border-line bg-surface p-1 shadow-[0_8px_24px_rgb(20_18_15/0.14)]"
          >
            <DropdownMenu.Item className={ITEM} onSelect={() => open(`/books/${book.id}`)}>
              Ver ficha
            </DropdownMenu.Item>
            <DropdownMenu.Item className={ITEM} onSelect={() => open(`/books/${book.id}/edit`)}>
              Editar
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item
              className={`${ITEM} text-danger`}
              onSelect={() => setIsConfirmingDelete(true)}
            >
              Eliminar…
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {isConfirmingDelete && (
        <DeleteBookDialog
          book={book}
          onClose={() => setIsConfirmingDelete(false)}
          onDeleted={() => (wasDeleted.current = true)}
          // Back to this row's menu button, or to the catalog heading once the row is gone.
          returnFocusTo={() =>
            wasDeleted.current ? document.getElementById(CATALOG_HEADING_ID) : triggerRef.current
          }
        />
      )}
    </>
  )
}
