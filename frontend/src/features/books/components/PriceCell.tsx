import type { Book } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { Spinner } from '../../../components/ui/Spinner'
import { formatAmount } from '../../../lib/format'
import { useCalculatePrice } from '../queries'

/** The selling price, or the action that calculates it right in the row. */
export function PriceCell({ book }: { book: Book }) {
  const { calculate, isCalculating } = useCalculatePrice(book)

  if (book.selling_price_local !== null) {
    return (
      <>
        {formatAmount(book.selling_price_local, book.currency)}{' '}
        <span className="text-xs text-muted">{book.currency}</span>
      </>
    )
  }

  return (
    <Button
      variant="subtle"
      size="sm"
      onClick={calculate}
      disabled={isCalculating}
      aria-label={`Calcular precio de venta de «${book.title}»`}
    >
      {isCalculating && <Spinner className="size-3.5" />}
      {isCalculating ? 'Calculando…' : 'Calcular'}
    </Button>
  )
}
