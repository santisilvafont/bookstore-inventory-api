import { describe, expect, it } from 'vitest'

import { findIsbnProblem, stripIsbn, toIsbn13 } from './isbn'

// Same cases as backend/books/tests/test_isbn.py, so both sides agree.
describe('findIsbnProblem', () => {
  it.each(['9788437604947', '978-84-376-0494-7', '0306406152', '0-8044-2957-x'])(
    'accepts the valid ISBN %s',
    (isbn) => {
      expect(findIsbnProblem(isbn)).toBeNull()
    },
  )

  it.each([
    '',
    '123456789',
    '12345678901',
    '97884376049A7',
    'X306406152',
    '９７８８４３７６０４９４７',
  ])('reports a format problem for %s', (isbn) => {
    expect(findIsbnProblem(isbn)).toBe('format')
  })

  it('reports a 13-digit number that is not a book', () => {
    expect(findIsbnProblem('4006381333931')).toBe('prefix')
  })

  it.each(['9788437604940', '0306406153'])('reports a wrong check digit in %s', (isbn) => {
    expect(findIsbnProblem(isbn)).toBe('checksum')
  })
})

describe('stripIsbn', () => {
  it('removes spaces, hyphens and Unicode dashes', () => {
    expect(stripIsbn('978‑84‑376 0494—7')).toBe('9788437604947')
  })
})

describe('toIsbn13', () => {
  it('converts an ISBN-10 like the backend does', () => {
    expect(toIsbn13('0-306-40615-2')).toBe('9780306406157')
    expect(toIsbn13('0-8044-2957-x')).toBe('9780804429573')
  })

  it('leaves an ISBN-13 as it is, without separators', () => {
    expect(toIsbn13('978-84-376-0494-7')).toBe('9788437604947')
  })
})
