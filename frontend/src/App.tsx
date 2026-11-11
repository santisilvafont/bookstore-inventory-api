import { Link, Route, Routes, useLocation } from 'react-router'

import { AppLayout } from './components/layout/AppLayout'
import { buttonClasses } from './components/ui/buttonStyles'
import { StatusMessage } from './components/ui/StatusMessage'
import { BookDetailPanel } from './features/books/BookDetailPanel'
import { EditBookDialog, NewBookDialog } from './features/books/BookFormDialog'
import { CatalogPage } from './features/books/CatalogPage'
import { inAppNavigationState } from './features/books/navigation'

export function App() {
  return (
    <AppLayout actions={<NewBookLink />}>
      <Routes>
        {/* Detail and forms open over the catalog, which keeps its filters underneath. */}
        <Route path="/" element={<CatalogPage />}>
          <Route path="books/new" element={<NewBookDialog />} />
          <Route path="books/:bookId" element={<BookDetailPanel />} />
          <Route path="books/:bookId/edit" element={<EditBookDialog />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

function NewBookLink() {
  const { search } = useLocation()
  return (
    <Link
      to={{ pathname: '/books/new', search }}
      state={inAppNavigationState}
      className={buttonClasses('primary')}
    >
      Nuevo libro
    </Link>
  )
}

function NotFoundPage() {
  return (
    <StatusMessage
      title="Esta página no existe."
      action={
        <Link to="/" className={buttonClasses('link')}>
          Volver al catálogo
        </Link>
      }
    />
  )
}
