import type { Book } from '../../../api/types'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useDeleteBook } from '../queries'

interface DeleteBookDialogProps {
  book: Pick<Book, 'id' | 'title'>
  onClose: () => void
  /** Runs after the book is gone, e.g. to close the detail panel that showed it. */
  onDeleted?: () => void
  returnFocusTo?: () => HTMLElement | null | undefined
}

/** Mounted only while open, so a page of rows does not keep a closed dialog per book. */
export function DeleteBookDialog({
  book,
  onClose,
  onDeleted,
  returnFocusTo,
}: DeleteBookDialogProps) {
  const deletion = useDeleteBook(book, () => {
    onClose()
    onDeleted?.()
  })

  return (
    <ConfirmDialog
      open
      title={`¿Eliminar «${book.title}»?`}
      description="Se borrará del catálogo junto con su precio de venta. Esta acción no se puede deshacer."
      confirmLabel="Eliminar libro"
      pendingLabel="Eliminando…"
      isPending={deletion.isPending}
      onConfirm={() => deletion.mutate()}
      onCancel={onClose}
      returnFocusTo={returnFocusTo}
    />
  )
}
