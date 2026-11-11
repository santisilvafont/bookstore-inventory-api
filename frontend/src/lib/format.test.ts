import { describe, expect, it } from 'vitest'

import { formatAmount, formatInteger } from './format'

describe('formatAmount', () => {
  it('uses Spanish separators and two decimals for most currencies', () => {
    expect(formatAmount(17092.124, 'ARS')).toBe('17.092,12')
    expect(formatAmount(20.02, 'EUR')).toBe('20,02')
    expect(formatAmount(15, 'USD')).toBe('15,00')
  })

  it('uses no decimals for currencies without minor units', () => {
    expect(formatAmount(3440.75, 'JPY')).toBe('3441')
  })
})

describe('formatInteger', () => {
  it('groups thousands', () => {
    expect(formatInteger(12500)).toBe('12.500')
  })
})
