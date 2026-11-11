import { describe, expect, it } from 'vitest'

import { makeBook } from '../../test/fakeApi'
import { type BookFormValues, bookFormSchema, toBookFormValues } from './bookSchema'

const validForm: BookFormValues = {
  title: ' Rayuela ',
  author: 'Julio Cortázar',
  isbn: '978-84-376-0457-2',
  cost_usd: '16,20',
  stock_quantity: '4',
  category: 'Novela',
  supplier_country: 'ES',
}

const errorsFor = (overrides: Partial<BookFormValues>) => {
  const result = bookFormSchema.safeParse({ ...validForm, ...overrides })
  return result.success ? {} : result.error.flatten().fieldErrors
}

describe('bookFormSchema', () => {
  it('turns valid form values into the API payload', () => {
    expect(bookFormSchema.parse(validForm)).toEqual({
      title: 'Rayuela',
      author: 'Julio Cortázar',
      isbn: '9788437604572',
      cost_usd: 16.2,
      stock_quantity: 4,
      category: 'Novela',
      supplier_country: 'ES',
    })
  })

  it('requires every field', () => {
    const result = bookFormSchema.safeParse({
      title: ' ',
      author: '',
      isbn: '',
      cost_usd: '',
      stock_quantity: '',
      category: '',
      supplier_country: '',
    })

    expect(Object.keys(result.error?.flatten().fieldErrors ?? {}).sort()).toEqual([
      'author',
      'category',
      'cost_usd',
      'isbn',
      'stock_quantity',
      'supplier_country',
      'title',
    ])
  })

  it.each([
    ['978-84-376-0457-0', 'El dígito de control del ISBN no es válido.'],
    ['12345', 'El ISBN debe tener 10 o 13 dígitos.'],
  ])('rejects the ISBN %s', (isbn, message) => {
    expect(errorsFor({ isbn }).isbn).toEqual([message])
  })

  it.each(['15.99', '15,99', '15', '0.5'])('accepts the cost %s', (cost_usd) => {
    expect(errorsFor({ cost_usd }).cost_usd).toBeUndefined()
  })

  it.each([
    ['0', 'El costo debe ser mayor a 0.'],
    ['-3', 'Escribe un importe con hasta 2 decimales, por ejemplo 15,99.'],
    ['15.999', 'Escribe un importe con hasta 2 decimales, por ejemplo 15,99.'],
    ['abc', 'Escribe un importe con hasta 2 decimales, por ejemplo 15,99.'],
    ['100000000', 'El costo es demasiado alto.'],
  ])('rejects the cost %s', (cost_usd, message) => {
    expect(errorsFor({ cost_usd }).cost_usd).toEqual([message])
  })

  it.each(['-1', '2.5', 'diez'])('rejects the stock %s', (stock_quantity) => {
    expect(errorsFor({ stock_quantity }).stock_quantity).toEqual([
      'El stock debe ser un número entero, 0 o mayor.',
    ])
  })
})

describe('toBookFormValues', () => {
  it('fills the form with a book, keeping two decimals in the cost', () => {
    expect(toBookFormValues(makeBook({ cost_usd: 16.2, stock_quantity: 0 }))).toMatchObject({
      cost_usd: '16,20',
      stock_quantity: '0',
    })
  })
})
