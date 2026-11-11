import { Link, useLocation } from 'react-router'

import type { Book } from '../../../api/types'
import { formatAmount } from '../../../lib/format'
import { detailLinkState } from '../navigation'
import { PriceCell } from './PriceCell'
import { StockLevel } from './StockLevel'

const HEADER_CELL = 'px-3 pt-2 pb-2.5 font-medium first:pl-0 last:pr-0'
const CELL = 'px-3 py-2.5 align-top first:pl-0 last:pr-0'

interface BookTableProps {
  books: Book[]
  countryNames: Map<string, string>
  lowStockThreshold: number
  isUpdating: boolean
}

export function BookTable({ books, countryNames, lowStockThreshold, isUpdating }: BookTableProps) {
  // The detail panel opens over the catalog, so its URL keeps the current filters.
  const { search } = useLocation()

  return (
    <div className="overflow-x-auto">
      <table
        aria-busy={isUpdating}
        className={`w-full min-w-240 border-collapse transition-opacity ${isUpdating ? 'opacity-60' : ''}`}
      >
        <caption className="sr-only">Libros del catálogo</caption>
        <thead>
          <tr className="text-left text-[13px] text-muted">
            <th scope="col" className={HEADER_CELL}>
              Título
            </th>
            <th scope="col" className={HEADER_CELL}>
              Categoría
            </th>
            <th scope="col" className={HEADER_CELL}>
              ISBN
            </th>
            <th scope="col" className={HEADER_CELL}>
              País
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Stock
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Costo USD
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Precio de venta
            </th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id} className="border-t border-line">
              <td className={CELL}>
                <Link
                  to={{ pathname: `/books/${book.id}`, search }}
                  state={detailLinkState}
                  className="font-semibold underline-offset-4 hover:text-accent-text hover:underline"
                >
                  {book.title}
                </Link>
                <p className="text-[13px] text-muted">{book.author}</p>
              </td>
              <td className={CELL}>{book.category}</td>
              <td className={`${CELL} text-muted tabular-nums`}>{book.isbn}</td>
              <td className={CELL}>
                <abbr
                  title={countryNames.get(book.supplier_country)}
                  className="text-muted no-underline"
                >
                  {book.supplier_country}
                </abbr>
              </td>
              <td className={`${CELL} text-right whitespace-nowrap tabular-nums`}>
                <StockLevel quantity={book.stock_quantity} lowStockThreshold={lowStockThreshold} />
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatAmount(book.cost_usd, 'USD')}
              </td>
              <td className={`${CELL} text-right whitespace-nowrap tabular-nums`}>
                <PriceCell book={book} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BookTableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="h-9" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-t border-line py-4">
          <div className="h-3.5 w-1/4 rounded bg-line motion-safe:animate-pulse" />
          <div className="h-3.5 w-1/6 rounded bg-line motion-safe:animate-pulse" />
          <div className="h-3.5 w-1/6 rounded bg-line motion-safe:animate-pulse" />
          <div className="ml-auto h-3.5 w-1/12 rounded bg-line motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  )
}
