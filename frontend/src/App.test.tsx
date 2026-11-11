import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { countriesResponse, fakeApi, pageOf } from './test/fakeApi'
import { renderWithProviders } from './test/render'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the catalog on the home page', async () => {
    fakeApi({
      'GET /books': (url) => pageOf([], url),
      'GET /books/low-stock': (url) => pageOf([], url),
      'OPTIONS /books': countriesResponse,
    })
    renderWithProviders(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Librería')
    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
    expect(await screen.findByText('Todavía no hay libros en el catálogo.')).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', () => {
    renderWithProviders(<App />, { route: '/no-existe' })

    expect(screen.getByText('Esta página no existe.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/')
  })
})
