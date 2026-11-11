import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../App'
import type { Book, PriceCalculation } from '../../api/types'
import { countriesResponse, fakeApi, makeBook, pageOf } from '../../test/fakeApi'
import { jsonResponse } from '../../test/http'
import { getCurrentLocation, renderWithProviders } from '../../test/render'

afterEach(() => {
  vi.unstubAllGlobals()
})

const book = makeBook({ id: 1, cost_usd: 15.99, currency: 'EUR', selling_price_local: null })

const calculation: PriceCalculation = {
  book_id: 1,
  cost_usd: 15.99,
  exchange_rate: 0.85,
  cost_local: 13.59,
  margin_percentage: 40,
  selling_price_local: 19.03,
  currency: 'EUR',
  rate_source: 'live',
  calculation_timestamp: '2026-11-11T10:30:00Z',
}

function detailApi({
  initial = book,
  calculate = () => jsonResponse(calculation),
}: {
  initial?: Book | null
  calculate?: () => Response
} = {}) {
  let current = initial
  return fakeApi({
    'GET /books': (url) => pageOf(current ? [current] : [], url),
    'GET /books/search': (url) => pageOf(current ? [current] : [], url),
    'GET /books/low-stock': (url) => pageOf([], url),
    'OPTIONS /books': countriesResponse,
    'GET /books/1': () =>
      current
        ? jsonResponse(current)
        : jsonResponse(
            { status: 404, code: 'not_found', detail: 'No existe un libro con este ID.' },
            404,
          ),
    'POST /books/1/calculate-price': () => {
      const response = calculate()
      if (response.ok && current) {
        current = { ...current, selling_price_local: calculation.selling_price_local }
      }
      return response
    },
  })
}

const openPanel = () => screen.findByRole('dialog', { name: 'Don Quijote de la Mancha' })

describe('BookDetailPanel', () => {
  it('shows the book over the catalog', async () => {
    detailApi()
    renderWithProviders(<App />, { route: '/books/1' })

    const panel = await openPanel()
    expect(within(panel).getByText('Literatura clásica · España')).toBeInTheDocument()
    expect(within(panel).getByText('9788437604947')).toBeInTheDocument()
    expect(within(panel).getByText('15,99 USD')).toBeInTheDocument()
    expect(within(panel).getByText(/Aún no tiene precio de venta/)).toBeInTheDocument()
  })

  it('calculates the selling price and shows the breakdown', async () => {
    detailApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: 'Calcular precio de venta' }))

    const breakdown = await within(panel).findByRole('table', {
      name: 'Desglose del precio de venta',
    })
    // The value cell next to the row header with this label.
    const value = (label: string) =>
      within(breakdown).getByRole('rowheader', { name: label }).nextElementSibling
    expect(value('Costo')).toHaveTextContent('15,99 USD')
    expect(value('Tasa USD → EUR')).toHaveTextContent('× 0,85')
    expect(value('Costo en EUR')).toHaveTextContent('13,59 EUR')
    expect(value('Margen 40 %')).toHaveTextContent('+ 5,44 EUR')
    expect(value('Precio sugerido')).toHaveTextContent('19,03 EUR')
    expect(
      await screen.findByText('Precio calculado para «Don Quijote de la Mancha»'),
    ).toBeInTheDocument()
    // Already on the breakdown: the toast does not offer to open it.
    expect(screen.queryByRole('button', { name: 'Ver desglose' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Recalcular precio' })).toBeInTheDocument()
  })

  it('warns when the default exchange rate was used', async () => {
    detailApi({ calculate: () => jsonResponse({ ...calculation, rate_source: 'default' }) })
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: 'Calcular precio de venta' }))

    expect(await within(panel).findByRole('note')).toHaveTextContent('tasa por defecto')
  })

  it('reports a failed calculation without showing a breakdown', async () => {
    detailApi({
      calculate: () =>
        jsonResponse(
          {
            status: 503,
            code: 'exchange_rate_unavailable',
            detail: 'No hay una tasa de cambio disponible. Inténtelo más tarde.',
          },
          503,
        ),
    })
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: 'Calcular precio de venta' }))

    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    expect(within(panel).queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a stored price without a breakdown until it is recalculated', async () => {
    detailApi({ initial: { ...book, selling_price_local: 20.02 } })
    renderWithProviders(<App />, { route: '/books/1' })

    const panel = await openPanel()
    expect(within(panel).getByText('20,02')).toBeInTheDocument()
    expect(within(panel).getByText(/Precio guardado/)).toBeInTheDocument()
  })

  it('explains when the book does not exist', async () => {
    detailApi({ initial: null })
    renderWithProviders(<App />, { route: '/books/1' })

    const panel = await screen.findByRole('dialog', { name: 'Libro no encontrado' })
    expect(within(panel).getByText('Este libro no existe o fue eliminado.')).toBeInTheDocument()
  })

  it.each(['1e1', '0x10', '1.0', '0', 'abc'])('rejects the non-canonical id %s', async (id) => {
    detailApi()
    renderWithProviders(<App />, { route: `/books/${id}` })

    const panel = await screen.findByRole('dialog', { name: 'Libro no encontrado' })
    expect(within(panel).getByText(/no corresponde a ningún libro/)).toBeInTheDocument()
  })

  it('goes back in history when it was opened from the catalog', async () => {
    detailApi()
    const { user } = renderWithProviders(<App />, { route: '/?category=novela' })

    await user.click(await screen.findByRole('link', { name: 'Don Quijote de la Mancha' }))
    const panel = await openPanel()
    expect(getCurrentLocation()).toBe('/books/1?category=novela')

    await user.click(within(panel).getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(getCurrentLocation()).toBe('/?category=novela'))
  })

  it('returns to the catalog with the same filters when opened from a link', async () => {
    detailApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1?stock=low&threshold=3' })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getCurrentLocation()).toBe('/?stock=low&threshold=3')
  })

  it('closes with the Escape key', async () => {
    detailApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    await openPanel()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(getCurrentLocation()).toBe('/'))
  })
})

describe('Calculating from the catalog table', () => {
  it('calculates in the row and links to the breakdown', async () => {
    detailApi()
    const { user } = renderWithProviders(<App />)

    await user.click(
      await screen.findByRole('button', { name: /Calcular precio de venta de «Don Quijote/ }),
    )

    const toastAction = await screen.findByRole('button', { name: 'Ver desglose' })
    expect(await screen.findByText('19,03')).toBeInTheDocument()

    await user.click(toastAction)

    const panel = await openPanel()
    expect(
      within(panel).getByRole('table', { name: 'Desglose del precio de venta' }),
    ).toBeInTheDocument()
    expect(getCurrentLocation()).toBe('/books/1')
  })

  it('reports a failed calculation in a toast', async () => {
    detailApi({ calculate: () => new Response(null, { status: 500 }) })
    const { user } = renderWithProviders(<App />)

    await user.click(
      await screen.findByRole('button', { name: /Calcular precio de venta de «Don Quijote/ }),
    )

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Calcular precio de venta de «Don Quijote/ }),
    ).toBeEnabled()
  })
})
