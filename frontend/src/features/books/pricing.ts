import type { PriceCalculation } from '../../api/types'

/** The amount the margin adds, as the difference between the two rounded figures. */
export function marginAmount({ selling_price_local, cost_local }: PriceCalculation): number {
  return Math.round((selling_price_local - cost_local) * 100) / 100
}
