import { describe, expect, it } from 'vitest'

import type { PriceCalculation } from '../../api/types'
import { marginAmount } from './pricing'

const calculation = (cost_local: number, selling_price_local: number) =>
  ({ cost_local, selling_price_local }) as PriceCalculation

describe('marginAmount', () => {
  it('is the difference between the rounded figures, so the breakdown adds up', () => {
    // The specification example: 13.59 × 1.40 = 19.026 → 19.03.
    expect(marginAmount(calculation(13.59, 19.03))).toBe(5.44)
  })

  it('avoids floating point noise', () => {
    expect(marginAmount(calculation(14.3, 20.02))).toBe(5.72)
  })
})
