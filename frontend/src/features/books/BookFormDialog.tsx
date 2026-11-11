import { useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { Modal } from '../../components/ui/Modal'
import { emptyBookForm, toBookFormValues } from './bookSchema'
import { BookForm } from './components/BookForm'
import { BookLoadError } from './components/BookLoadError'
import { parseBookId, useCloseOverlay } from './navigation'
import { useBook, useCountries, useSaveBook } from './queries'

export function NewBookDialog() {
  const close = useCloseOverlay()
  const navigate = useNavigate()
  const location = useLocation()
  const save = useSaveBook()

  return (
    <Modal
      title="Nuevo libro"
      description="El precio de venta se calcula después, desde la ficha del libro."
      // Closing mid-save would navigate twice: once now and once when the save finishes.
      preventClose={save.isPending}
      onClose={close}
    >
      <BookForm
        defaultValues={emptyBookForm}
        submitLabel="Guardar libro"
        onCancel={close}
        onSubmit={async (input) => {
          const book = await save.mutateAsync(input)
          toast.success(`«${book.title}» añadido al catálogo`)
          // Show the new book in place of the form, keeping how the form was reached.
          navigate(
            { pathname: `/books/${book.id}`, search: location.search },
            { replace: true, state: location.state },
          )
        }}
      />
    </Modal>
  )
}

export function EditBookDialog() {
  const id = parseBookId(useParams().bookId)
  const close = useCloseOverlay(id === null ? '/' : `/books/${id}`)

  if (id === null) {
    return (
      <Modal title="Libro no encontrado" onClose={close}>
        <p className="px-7 pb-7 text-muted">La dirección no corresponde a ningún libro.</p>
      </Modal>
    )
  }
  return <EditBook id={id} onClose={close} />
}

function EditBook({ id, onClose }: { id: number; onClose: () => void }) {
  const book = useBook(id)
  const countries = useCountries()
  const save = useSaveBook(id)

  if (book.isError) {
    return (
      <Modal title="Editar libro" onClose={onClose}>
        <div className="px-7 pb-7">
          <BookLoadError error={book.error} onRetry={() => book.refetch()} />
        </div>
      </Modal>
    )
  }

  // The form keeps its first values, so it waits for the API's current version of the book
  // (not a table row or a cached copy that may be out of date) and for the country options,
  // without which the saved country could not be preselected.
  const isReady = book.isSuccess && !book.isFetching && !countries.isPending
  if (!isReady) {
    return (
      <Modal title="Editar libro" onClose={onClose}>
        <div aria-hidden="true" className="flex flex-col gap-4 px-7 pb-8">
          <div className="h-11 rounded bg-line motion-safe:animate-pulse" />
          <div className="h-11 rounded bg-line motion-safe:animate-pulse" />
          <div className="h-11 w-2/3 rounded bg-line motion-safe:animate-pulse" />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Editar libro"
      description="Si cambias el costo o el país del proveedor, el precio de venta guardado se borra y habrá que recalcularlo."
      preventClose={save.isPending}
      onClose={onClose}
    >
      <BookForm
        defaultValues={toBookFormValues(book.data)}
        submitLabel="Guardar cambios"
        onCancel={onClose}
        onSubmit={async (input) => {
          const saved = await save.mutateAsync(input)
          toast.success('Cambios guardados', { description: saved.title })
          onClose()
        }}
      />
    </Modal>
  )
}
