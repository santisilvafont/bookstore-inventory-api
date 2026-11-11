import { formatInteger } from '../../../lib/format'

interface StockLevelProps {
  quantity: number
  lowStockThreshold: number
}

export function StockLevel({ quantity, lowStockThreshold }: StockLevelProps) {
  if (quantity === 0) return <span className="font-semibold text-danger">Agotado</span>
  if (quantity <= lowStockThreshold) {
    return (
      <span className="font-semibold text-warning">
        {formatInteger(quantity)} <span className="font-normal">· bajo</span>
      </span>
    )
  }
  return <span>{formatInteger(quantity)}</span>
}
