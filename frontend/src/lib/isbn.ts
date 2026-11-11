/**
 * ISBN rules, mirroring backend/books/isbn.py so the form rejects what the API would reject
 * before sending it. The API remains the authority; this only gives earlier feedback.
 */

const SEPARATORS = /[\s‐-―−-]/g
const ISBN_10 = /^[0-9]{9}[0-9X]$/
const ISBN_13 = /^[0-9]{13}$/

export type IsbnProblem = 'format' | 'prefix' | 'checksum'

export const ISBN_MESSAGES: Record<IsbnProblem, string> = {
  format: 'El ISBN debe tener 10 o 13 dígitos.',
  prefix: 'Un ISBN de 13 dígitos debe empezar por 978 o 979.',
  checksum: 'El dígito de control del ISBN no es válido.',
}

export function stripIsbn(value: string): string {
  return value.replace(SEPARATORS, '').toUpperCase()
}

/** What is wrong with an ISBN (with or without separators), or null if it is valid. */
export function findIsbnProblem(value: string): IsbnProblem | null {
  const isbn = stripIsbn(value)
  if (ISBN_10.test(isbn)) {
    return isbn10CheckDigit(isbn.slice(0, 9)) === isbn[9] ? null : 'checksum'
  }
  if (ISBN_13.test(isbn)) {
    if (!isbn.startsWith('978') && !isbn.startsWith('979')) return 'prefix'
    return isbn13CheckDigit(isbn.slice(0, 12)) === isbn[12] ? null : 'checksum'
  }
  return 'format'
}

/** The canonical ISBN-13 the backend will store for a valid ISBN-10 or ISBN-13. */
export function toIsbn13(value: string): string {
  const isbn = stripIsbn(value)
  if (isbn.length !== 10) return isbn
  const body = `978${isbn.slice(0, 9)}`
  return body + isbn13CheckDigit(body)
}

function isbn10CheckDigit(firstNine: string): string {
  const total = [...firstNine].reduce((sum, digit, index) => sum + (10 - index) * Number(digit), 0)
  const check = (11 - (total % 11)) % 11
  return check === 10 ? 'X' : String(check)
}

function isbn13CheckDigit(firstTwelve: string): string {
  const total = [...firstTwelve].reduce(
    (sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1),
    0,
  )
  return String((10 - (total % 10)) % 10)
}
