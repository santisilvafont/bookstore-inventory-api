import { z } from 'zod'

import type { Book, BookInput } from '../../api/types'
import { ISBN_MESSAGES, findIsbnProblem, stripIsbn } from '../../lib/isbn'

// Limits of the backend model, so the form never sends what the API would reject.
const MAX_COST = 99_999_999.99
const MAX_STOCK = 2_147_483_647

/** Form fields are strings while editing and become the API payload once valid. */
export const bookFormSchema = z.object({
  title: z.string().trim().min(1, 'Escribe el título.').max(255, 'Máximo 255 caracteres.'),
  author: z.string().trim().min(1, 'Escribe el autor.').max(255, 'Máximo 255 caracteres.'),
  isbn: z
    .string()
    .trim()
    .min(1, 'Escribe el ISBN.')
    .superRefine((value, context) => {
      const problem = findIsbnProblem(value)
      if (problem) context.addIssue({ code: 'custom', message: ISBN_MESSAGES[problem] })
    })
    .transform(stripIsbn),
  cost_usd: z
    .string()
    .trim()
    .min(1, 'Escribe el costo.')
    .regex(/^\d+([.,]\d{1,2})?$/, 'Escribe un importe con hasta 2 decimales, por ejemplo 15,99.')
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => value > 0, 'El costo debe ser mayor a 0.')
    .refine((value) => value <= MAX_COST, 'El costo es demasiado alto.'),
  stock_quantity: z
    .string()
    .trim()
    .min(1, 'Escribe el stock (puede ser 0).')
    .regex(/^\d+$/, 'El stock debe ser un número entero, 0 o mayor.')
    .transform(Number)
    .refine((value) => value <= MAX_STOCK, 'El stock es demasiado alto.'),
  category: z.string().trim().min(1, 'Escribe la categoría.').max(100, 'Máximo 100 caracteres.'),
  supplier_country: z.string().min(1, 'Elige el país del proveedor.'),
}) satisfies z.ZodType<BookInput, Record<keyof BookInput, string>>

export type BookFormValues = z.input<typeof bookFormSchema>

export const emptyBookForm: BookFormValues = {
  title: '',
  author: '',
  isbn: '',
  cost_usd: '',
  stock_quantity: '0',
  category: '',
  supplier_country: '',
}

export function toBookFormValues(book: Book): BookFormValues {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    // Decimal comma, as the field's placeholder and messages suggest (both are accepted).
    cost_usd: book.cost_usd.toFixed(2).replace('.', ','),
    stock_quantity: String(book.stock_quantity),
    category: book.category,
    supplier_country: book.supplier_country,
  }
}
