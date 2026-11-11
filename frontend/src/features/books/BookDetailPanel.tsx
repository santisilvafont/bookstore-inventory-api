import { Link, useLocation, useParams } from 'react-router'

import { ApiError } from '../../api/client'
import type { Book, PriceCalculation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { SidePanel } from '../../components/ui/SidePanel'
import { Spinner } from '../../components/ui/Spinner'
import { formatAmount, formatInteger, formatMoney } from '../../lib/format'
import { BookLoadError } from './components/BookLoadError'
import { PriceBreakdown } from './components/PriceBreakdown'
import { inAppNavigationState, parseBookId, useCloseOverlay } from './navigation'
import { useBook, useCalculatePrice, useCountries, useLatestPriceCalculation } from './queries'

export function BookDetailPanel() {
  const id = parseBookId(useParams().bookId)
  const close = useCloseOverlay()

  if (id === null) {
    return (
      <SidePanel title="Libro no encontrado" onClose={close}>
        <p className="text-muted">La dirección no corresponde a ningún libro.</p>
      </SidePanel>
    )
  }
  return <BookDetail id={id} onClose={close} />
}

function BookDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const book = useBook(id)

  if (book.isPending) {
    return (
      <SidePanel title="Cargando…" onClose={onClose}>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="h-4 w-1/2 rounded bg-line motion-safe:animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-line motion-safe:animate-pulse" />
        </div>
      </SidePanel>
    )
  }

  if (book.isError) {
    const isMissing = book.error instanceof ApiError && book.error.status === 404
    return (
      <SidePanel
        title={isMissing ? 'Libro no encontrado' : 'No se pudo cargar el libro'}
        onClose={onClose}
      >
        <BookLoadError error={book.error} onRetry={() => book.refetch()} />
      </SidePanel>
    )
  }

  return <BookDetailContent book={book.data} onClose={onClose} />
}

function BookDetailContent({ book, onClose }: { book: Book; onClose: () => void }) {
  const latestCalculation = useLatestPriceCalculation(book.id)
  const { calculate, isCalculating } = useCalculatePrice(book)
  const countries = useCountries()

  const countryName =
    countries.data?.find((country) => country.code === book.supplier_country)?.name ??
    book.supplier_country
  const hasPrice = book.selling_price_local !== null
  const { search } = useLocation()

  return (
    <SidePanel
      eyebrow={`${book.category} · ${countryName}`}
      title={book.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" onClick={calculate} disabled={isCalculating}>
            {isCalculating && <Spinner />}
            {isCalculating
              ? 'Calculando…'
              : hasPrice
                ? 'Recalcular precio'
                : 'Calcular precio de venta'}
          </Button>
          <Link
            to={{ pathname: `/books/${book.id}/edit`, search }}
            state={inAppNavigationState}
            className={buttonClasses()}
          >
            Editar
          </Link>
        </>
      }
    >
      <p className="-mt-4 text-base text-muted">{book.author}</p>

      <BookFacts book={book} />

      <section
        aria-labelledby="price-heading"
        className="flex flex-col gap-3 border-t border-line pt-5"
      >
        <h3 id="price-heading" className="text-[15px] font-bold">
          Precio de venta
        </h3>
        <PriceSection book={book} calculation={latestCalculation.data} />
      </section>
    </SidePanel>
  )
}

function BookFacts({ book }: { book: Book }) {
  const facts = [
    ['ISBN', book.isbn],
    ['Stock', `${formatInteger(book.stock_quantity)} unidades`],
    ['Costo de compra', formatMoney(book.cost_usd, 'USD')],
    ['Moneda de venta', book.currency],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
      {facts.map(([term, value]) => (
        <div key={term}>
          <dt className="text-[13px] text-muted">{term}</dt>
          <dd className="mt-0.5 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PriceSection({ book, calculation }: { book: Book; calculation?: PriceCalculation }) {
  // A breakdown is shown only while it still matches the stored price: editing the cost or the
  // supplier country clears the price on the backend, and with it this breakdown.
  if (calculation && calculation.selling_price_local === book.selling_price_local) {
    return <PriceBreakdown calculation={calculation} />
  }
  if (book.selling_price_local !== null) {
    return (
      <div className="flex flex-col gap-1">
        <p className="tabular-nums">
          <span className="text-[26px] font-bold tracking-tight text-accent-text">
            {formatAmount(book.selling_price_local, book.currency)}
          </span>{' '}
          <span className="font-medium text-muted">{book.currency}</span>
        </p>
        <p className="text-[13px] text-muted">
          Precio guardado. Recalcúlalo para ver el desglose con la tasa de hoy.
        </p>
      </div>
    )
  }
  return (
    <p className="text-muted">
      Aún no tiene precio de venta. Se calcula a partir del costo, la tasa de cambio del día y un
      margen del 40 %.
    </p>
  )
}
