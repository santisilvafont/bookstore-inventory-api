import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../App'
import type { Book, BookInput } from '../../api/types'
import { countriesResponse, fakeApi, makeBook, pageOf } from '../../test/fakeApi'
import { jsonResponse } from '../../test/http'
import { getCurrentLocation, renderWithProviders } from '../../test/render'

afterEach(() => {
  vi.unstubAllGlobals()
})

const existing = makeBook({ id: 1, stock_quantity: 25, cost_usd: 15.99 })

function formApi({
  create,
  createDelay,
}: {
  create?: (body: BookInput) => Response
  /** Holds the POST until this promise resolves, to test what happens while saving. */
  createDelay?: Promise<void>
} = {}) {
  const books: Book[] = [existing]
  const bodies: { method: string; body: BookInput }[] = []
  const save = (method: string, init: RequestInit | undefined, id: number) => {
    const body = JSON.parse(String(init?.body)) as BookInput
    bodies.push({ method, body })
    const book = { ...existing, ...body, id }
    const index = books.findIndex((candidate) => candidate.id === id)
    if (index >= 0) books[index] = book
    else books.push(book)
    return jsonResponse(book, method === 'POST' ? 201 : 200)
  }
  const fetchMock = fakeApi({
    'GET /books': (url) => pageOf(books, url),
    'GET /books/low-stock': (url) => pageOf([], url),
    'OPTIONS /books': countriesResponse,
    'GET /books/1': () => jsonResponse(books[0]),
    'GET /books/2': () => jsonResponse(books[1]),
    'POST /books': async (_url, init) => {
      await createDelay
      return create ? create(JSON.parse(String(init?.body))) : save('POST', init, 2)
    },
    'PUT /books/1': (_url, init) => save('PUT', init, 1),
  })
  return { fetchMock, bodies }
}

/** Fills the form inside `dialog` (the catalog behind it has its own "Categoría" field). */
async function fillNewBook(user: UserEvent, dialog: HTMLElement) {
  const values = {
    Título: 'Rayuela',
    Autor: 'Julio Cortázar',
    ISBN: '978-84-376-0457-2',
    'Costo (USD)': '16,20',
    Stock: '4',
    Categoría: 'Novela',
  }
  for (const [label, value] of Object.entries(values)) {
    const input = within(dialog).getByLabelText(label)
    await user.clear(input)
    await user.type(input, value)
  }
  const country = within(dialog).getByLabelText('País del proveedor')
  await waitFor(() => expect(country).toBeEnabled())
  await user.selectOptions(country, 'ES')
}

const saveButton = (name = 'Guardar libro') => screen.getByRole('button', { name })

describe('Creating a book', () => {
  it('opens the form from the header', async () => {
    formApi()
    const { user } = renderWithProviders(<App />)

    await user.click(screen.getByRole('link', { name: 'Nuevo libro' }))

    expect(await screen.findByRole('dialog', { name: 'Nuevo libro' })).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/books/new')
  })

  it('validates every field before sending anything', async () => {
    const { bodies } = formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    await screen.findByRole('dialog', { name: 'Nuevo libro' })
    await user.clear(screen.getByLabelText('Stock'))

    await user.click(saveButton())

    expect(await screen.findByText('Escribe el título.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el autor.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el ISBN.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el costo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el stock (puede ser 0).')).toBeInTheDocument()
    expect(screen.getByText('Escribe la categoría.')).toBeInTheDocument()
    expect(screen.getByText('Elige el país del proveedor.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveFocus()
    expect(bodies).toHaveLength(0)
  })

  it('checks the ISBN check digit when the user leaves the field', async () => {
    formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    await screen.findByRole('dialog', { name: 'Nuevo libro' })

    await user.type(screen.getByLabelText('ISBN'), '978-84-376-0457-0')
    await user.tab()

    expect(screen.getByLabelText('ISBN')).toHaveAccessibleDescription(
      /El dígito de control del ISBN no es válido/,
    )
  })

  it('tells the user an ISBN-10 will be stored as ISBN-13', async () => {
    formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    await screen.findByRole('dialog', { name: 'Nuevo libro' })

    await user.type(screen.getByLabelText('ISBN'), '0-306-40615-2')

    expect(
      screen.getByText('Es un ISBN-10: se guardará como ISBN-13 (9780306406157).'),
    ).toBeInTheDocument()
  })

  it('sends a clean payload and shows the new book', async () => {
    const { bodies } = formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo libro' })

    await fillNewBook(user, dialog)
    await user.click(saveButton())

    expect(await screen.findByText('«Rayuela» añadido al catálogo')).toBeInTheDocument()
    expect(bodies).toEqual([
      {
        method: 'POST',
        body: {
          title: 'Rayuela',
          author: 'Julio Cortázar',
          isbn: '9788437604572',
          cost_usd: 16.2,
          stock_quantity: 4,
          category: 'Novela',
          supplier_country: 'ES',
        },
      },
    ])
    expect(await screen.findByRole('dialog', { name: 'Rayuela' })).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/books/2')
  })

  it('shows the errors returned by the API under their fields', async () => {
    formApi({
      create: () =>
        jsonResponse(
          {
            status: 400,
            code: 'invalid',
            detail: 'Los datos enviados no son válidos.',
            errors: { isbn: ['Ya existe un libro con este ISBN.'] },
          },
          400,
        ),
    })
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo libro' })

    await fillNewBook(user, dialog)
    await user.click(saveButton())

    await waitFor(() =>
      expect(screen.getByLabelText('ISBN')).toHaveAccessibleDescription(
        /Ya existe un libro con este ISBN/,
      ),
    )
    expect(screen.getByLabelText('ISBN')).toHaveFocus()
    expect(screen.getByText('Datos no válidos')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nuevo libro' })).toBeInTheDocument()
  })

  it('cannot be closed while saving', async () => {
    let finishSaving = () => {}
    formApi({ createDelay: new Promise((resolve) => (finishSaving = resolve)) })
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo libro' })
    await fillNewBook(user, dialog)

    await user.click(saveButton())
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(getCurrentLocation()).toBe('/books/new')

    finishSaving()

    expect(await screen.findByRole('dialog', { name: 'Rayuela' })).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/books/2')
  })

  it('closes without saving on cancel', async () => {
    const { bodies } = formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/new' })
    await screen.findByRole('dialog', { name: 'Nuevo libro' })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(getCurrentLocation()).toBe('/'))
    expect(bodies).toHaveLength(0)
  })
})

describe('Editing a book', () => {
  it('fills the form with the book and saves the changes with PUT', async () => {
    const { bodies } = formApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1/edit' })

    const dialog = await screen.findByRole('dialog', { name: 'Editar libro' })
    const stock = await within(dialog).findByLabelText('Stock')
    expect(within(dialog).getByLabelText('Título')).toHaveValue('Don Quijote de la Mancha')
    expect(within(dialog).getByLabelText('Costo (USD)')).toHaveValue('15,99')
    expect(within(dialog).getByLabelText('País del proveedor')).toHaveValue('ES')

    await user.clear(stock)
    await user.type(stock, '3')
    await user.click(saveButton('Guardar cambios'))

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument()
    expect(bodies[0]).toMatchObject({ method: 'PUT', body: { stock_quantity: 3, cost_usd: 15.99 } })
    // Opened from a link: closing shows the book itself.
    await waitFor(() => expect(getCurrentLocation()).toBe('/books/1'))
  })

  it('returns to the detail panel it was opened from', async () => {
    formApi()
    const { user } = renderWithProviders(<App />)

    await user.click(await screen.findByRole('link', { name: 'Don Quijote de la Mancha' }))
    const panel = await screen.findByRole('dialog', { name: 'Don Quijote de la Mancha' })
    await user.click(within(panel).getByRole('link', { name: 'Editar' }))
    await screen.findByLabelText('Stock')

    await user.click(saveButton('Guardar cambios'))

    expect(
      await screen.findByRole('dialog', { name: 'Don Quijote de la Mancha' }),
    ).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/books/1')
  })
})
