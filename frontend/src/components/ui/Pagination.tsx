import { formatInteger } from '../../lib/format'
import { Button } from './Button'

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalItems)

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
    >
      <p className="text-muted tabular-nums">
        {formatInteger(first)}–{formatInteger(last)} de {formatInteger(totalItems)}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-5">
          <Button variant="link" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            ← Anterior
          </Button>
          <span className="tabular-nums">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="link"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente →
          </Button>
        </div>
      )}
    </nav>
  )
}
