import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type Book } from '../../api/types'
import { countriesResponse, fakeApi, makeBook, pageOf, requestsTo } from '../../test/fakeApi'
import { jsonResponse } from '../../test/http'
import { getCurrentLocation, renderWithProviders } from '../../test/render'
import { CatalogPage } from './CatalogPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const catalog: Book[] = [
  makeBook({ id: 1, selling_price_local: 20.02 }),
  makeBook({
    id: 2,
    title: 'Kafka en la orilla',
    author: 'Haruki Murakami',
    isbn: '9788483835043',
    category: 'Novela',
    supplier_country: 'JP',
    currency: 'JPY',
    stock_quantity: 1,
  }),
  makeBook({ id: 3, title: 'La ciudad y los perros', category: 'Novela', stock_quantity: 0 }),
]

function catalogApi(books: Book[] = catalog) {
  return fakeApi({
    'GET /books': (url) => pageOf(books, url),
    'GET /books/search': (url) => {
      const category = url.searchParams.get('category')?.toLowerCase() ?? ''
      return pageOf(
        books.filter((book) => book.category.toLowerCase().includes(category)),
        url,
      )
    },
    'GET /books/low-stock': (url) => {
      const threshold = Number(url.searchParams.get('threshold'))
      return pageOf(
        books.filter((book) => book.stock_quantity <= threshold),
        url,
      )
    },
    'OPTIONS /books': countriesResponse,
  })
}

const rowFor = (title: string) => screen.getByRole('row', { name: new RegExp(title) })

describe('CatalogPage', () => {
  it('lists the books with their stock level and selling price', async () => {
    catalogApi()
    renderWithProviders(<CatalogPage />)

    expect(await screen.findByText('Don Quijote de la Mancha')).toBeInTheDocument()
    expect(within(rowFor('Don Quijote')).getByText('20,02')).toBeInTheDocument()
    expect(within(rowFor('Don Quijote')).getByText('EUR')).toBeInTheDocument()
    expect(
      within(rowFor('Kafka')).getByRole('button', { name: /Calcular precio de venta/ }),
    ).toBeInTheDocument()
    expect(within(rowFor('Kafka')).getByText('· bajo')).toBeInTheDocument()
    expect(within(rowFor('La ciudad')).getByText('Agotado')).toBeInTheDocument()
    expect(within(rowFor('Kafka')).getByTitle('Japón')).toHaveTextContent('JP')
  })

  it('shows the totals of each stock view on its tab', async () => {
    catalogApi()
    renderWithProviders(<CatalogPage />)

    const tabs = screen.getByRole('navigation', { name: 'Filtrar por stock' })
    await waitFor(() =>
      expect(within(tabs).getByRole('link', { name: /Todos/ })).toHaveTextContent('3'),
    )
    expect(within(tabs).getByRole('link', { name: /Stock bajo/ })).toHaveTextContent('2')
    expect(within(tabs).getByRole('link', { name: /Agotados/ })).toHaveTextContent('1')
  })

  it('filters by stock view from the tabs and keeps it in the URL', async () => {
    const fetchMock = catalogApi()
    const { user } = renderWithProviders(<CatalogPage />)
    await screen.findByText('Don Quijote de la Mancha')

    await user.click(screen.getByRole('link', { name: /Agotados/ }))

    await waitFor(() =>
      expect(screen.queryByText('Don Quijote de la Mancha')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('La ciudad y los perros')).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/?stock=out')
    expect(
      requestsTo(fetchMock, '/books/low-stock').some(
        (url) => url.searchParams.get('threshold') === '0',
      ),
    ).toBe(true)
  })

  it('searches by category once the user stops typing', async () => {
    const fetchMock = catalogApi()
    const { user } = renderWithProviders(<CatalogPage />)
    await screen.findByText('Don Quijote de la Mancha')

    await user.type(screen.getByLabelText('Categoría'), 'nove')

    await waitFor(() => expect(getCurrentLocation()).toBe('/?category=nove'))
    await waitFor(() =>
      expect(screen.queryByText('Don Quijote de la Mancha')).not.toBeInTheDocument(),
    )
    const searches = requestsTo(fetchMock, '/books/search')
    expect(searches).toHaveLength(1)
    expect(searches[0].searchParams.get('category')).toBe('nove')
  })

  it('moves between pages', async () => {
    const books = Array.from({ length: 12 }, (_, index) =>
      makeBook({ id: index + 1, title: `Libro ${index + 1}`, isbn: `isbn-${index}` }),
    )
    catalogApi(books)
    const { user } = renderWithProviders(<CatalogPage />)
    await screen.findByText('Libro 1')

    await user.click(screen.getByRole('button', { name: /Siguiente/ }))

    expect(await screen.findByText('Libro 11')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/?page=2')
  })

  it('returns to the first page when the requested page does not exist', async () => {
    catalogApi()
    renderWithProviders(<CatalogPage />, { route: '/?page=9' })

    await waitFor(() => expect(getCurrentLocation()).toBe('/'))
    expect(await screen.findByText('Don Quijote de la Mancha')).toBeInTheDocument()
  })

  it('explains an empty result and offers the whole catalog', async () => {
    catalogApi([])
    renderWithProviders(<CatalogPage />, { route: '/?category=poesía' })

    expect(await screen.findByText('No hay libros en la categoría «poesía».')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todo el catálogo' })).toBeInTheDocument()
  })

  it('shows API errors and lets the user retry', async () => {
    let calls = 0
    fakeApi({
      'GET /books': (url) =>
        ++calls === 1
          ? jsonResponse({ status: 500, code: 'server_error', detail: 'Error interno' }, 500)
          : pageOf(catalog, url),
      'GET /books/low-stock': (url) => pageOf([], url),
      'OPTIONS /books': countriesResponse,
    })
    const { user } = renderWithProviders(<CatalogPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Error del servidor')

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Don Quijote de la Mancha')).toBeInTheDocument()
  })
})
