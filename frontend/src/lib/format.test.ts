import { describe, expect, it } from 'vitest'

import { formatAmount, formatDateTime, formatInteger, formatMoney, formatRate } from './format'

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

describe('formatMoney', () => {
  it('appends the currency code', () => {
    expect(formatMoney(19.03, 'EUR')).toBe('19,03 EUR')
  })
})

describe('formatInteger', () => {
  it('groups thousands', () => {
    expect(formatInteger(12500)).toBe('12.500')
  })
})

describe('formatRate', () => {
  it('keeps up to six decimals without trailing zeros', () => {
    expect(formatRate(0.85)).toBe('0,85')
    expect(formatRate(18.6123456)).toBe('18,612346')
  })
})

describe('formatDateTime', () => {
  it('formats an ISO timestamp', () => {
    expect(formatDateTime('2026-11-11T10:30:00Z')).toMatch(/2026/)
  })

  it('returns an empty string instead of failing on an invalid date', () => {
    expect(formatDateTime('not a date')).toBe('')
  })
})
