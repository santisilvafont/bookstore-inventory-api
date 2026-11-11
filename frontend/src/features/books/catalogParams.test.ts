import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  parseCatalogParams,
  toBookFilter,
  toSearchParams,
} from './catalogParams'

const parse = (query: string) => parseCatalogParams(new URLSearchParams(query))

describe('parseCatalogParams', () => {
  it('defaults to the whole catalog, first page', () => {
    expect(parse('')).toEqual({
      stock: 'all',
      category: '',
      threshold: DEFAULT_LOW_STOCK_THRESHOLD,
      page: 1,
    })
  })

  it('reads every parameter', () => {
    expect(parse('stock=low&threshold=3&page=2')).toMatchObject({
      stock: 'low',
      threshold: 3,
      page: 2,
    })
  })

  it('ignores the category in a stock view, because the API cannot combine both', () => {
    expect(parse('stock=out&category=Fantasía').category).toBe('')
  })

  it.each(['page=abc', 'page=-2', 'page=0'])('falls back to page 1 for %s', (query) => {
    expect(parse(query).page).toBe(1)
  })

  it.each(['threshold=-1', 'threshold=abc', 'threshold=2.5'])(
    'falls back to the default threshold for %s',
    (query) => {
      expect(parse(`stock=low&${query}`).threshold).toBe(DEFAULT_LOW_STOCK_THRESHOLD)
    },
  )

  it('falls back to the whole catalog for an unknown stock view', () => {
    expect(parse('stock=unknown').stock).toBe('all')
  })
})

describe('toSearchParams', () => {
  it('leaves default values out of the URL', () => {
    expect(toSearchParams(parse('')).toString()).toBe('')
  })

  it('round-trips a non-default state', () => {
    const query = 'stock=low&threshold=3&page=2'
    expect(toSearchParams(parse(query)).toString()).toBe(query)
  })

  it('keeps a custom threshold in the other views', () => {
    expect(toSearchParams({ ...parse('threshold=3'), stock: 'out' }).toString()).toBe(
      'stock=out&threshold=3',
    )
  })
})

describe('toBookFilter', () => {
  it.each([
    ['', { kind: 'all' }],
    ['category=Fantasía', { kind: 'category', category: 'Fantasía' }],
    ['stock=low&threshold=4', { kind: 'lowStock', threshold: 4 }],
    ['stock=out', { kind: 'lowStock', threshold: 0 }],
  ])('maps "%s" to the API filter', (query, filter) => {
    expect(toBookFilter(parse(query))).toEqual(filter)
  })
})
