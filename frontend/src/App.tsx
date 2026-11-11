import { Link, Route, Routes } from 'react-router'

import { AppLayout } from './components/layout/AppLayout'
import { StatusMessage } from './components/ui/StatusMessage'
import { CatalogPage } from './features/books/CatalogPage'

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route index element={<CatalogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

function NotFoundPage() {
  return (
    <StatusMessage
      title="Esta página no existe."
      action={
        <Link to="/" className="font-semibold text-accent-text underline-offset-4 hover:underline">
          Volver al catálogo
        </Link>
      }
    />
  )
}
