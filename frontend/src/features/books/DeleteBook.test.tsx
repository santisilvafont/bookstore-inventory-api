import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../App'
import type { Book } from '../../api/types'
import { countriesResponse, fakeApi, makeBook, pageOf, requestsTo } from '../../test/fakeApi'
import { jsonResponse } from '../../test/http'
import { getCurrentLocation, renderWithProviders } from '../../test/render'

afterEach(() => {
  vi.unstubAllGlobals()
})

const TITLE = 'Don Quijote de la Mancha'

/** Book 1 is the one deleted; `others` are listed after it. */
function deleteApi(
  respond: () => Response = () => new Response(null, { status: 204 }),
  others: Book[] = [],
) {
  let books: Book[] = [...others, makeBook({ id: 1, title: TITLE })]
  return fakeApi({
    'GET /books': (url) => pageOf(books, url),
    'GET /books/low-stock': (url) => pageOf([], url),
    'OPTIONS /books': countriesResponse,
    'GET /books/1': () => jsonResponse(books.find((book) => book.id === 1)),
    'DELETE /books/1': () => {
      const response = respond()
      if (response.status === 204 || response.status === 404) {
        books = books.filter((book) => book.id !== 1)
      }
      return response
    },
  })
}

const confirmation = () => screen.findByRole('alertdialog', { name: `¿Eliminar «${TITLE}»?` })

async function openRowMenu(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: `Acciones para «${TITLE}»` }))
  return screen.findByRole('menu')
}

describe('Deleting from the detail panel', () => {
  it('asks for confirmation and does nothing on cancel', async () => {
    const fetchMock = deleteApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await screen.findByRole('dialog', { name: TITLE })

    await user.click(within(panel).getByRole('button', { name: 'Eliminar' }))
    const dialog = await confirmation()
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument()
    // Focus starts on the safe option.
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument()
    expect(requestsTo(fetchMock, '/books/1').length).toBe(1) // Only the GET.
  })

  it('deletes the book, closes the panel and removes it from the catalog', async () => {
    deleteApi()
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await screen.findByRole('dialog', { name: TITLE })

    await user.click(within(panel).getByRole('button', { name: 'Eliminar' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Eliminar libro' }))

    expect(await screen.findByText(`«${TITLE}» eliminado del catálogo`)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(getCurrentLocation()).toBe('/')
    expect(await screen.findByText('Todavía no hay libros en el catálogo.')).toBeInTheDocument()
  })

  it('keeps the dialog open and reports the error when deletion fails', async () => {
    deleteApi(() => jsonResponse({ status: 500, code: 'server_error', detail: 'Error' }, 500))
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await screen.findByRole('dialog', { name: TITLE })

    await user.click(within(panel).getByRole('button', { name: 'Eliminar' }))
    const dialog = await confirmation()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar libro' }))

    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Eliminar libro' })).toBeEnabled()
    expect(getCurrentLocation()).toBe('/books/1')
  })

  it('treats a book already deleted elsewhere as gone', async () => {
    deleteApi(() =>
      jsonResponse(
        { status: 404, code: 'not_found', detail: 'No existe un libro con este ID.' },
        404,
      ),
    )
    const { user } = renderWithProviders(<App />, { route: '/books/1' })
    const panel = await screen.findByRole('dialog', { name: TITLE })

    await user.click(within(panel).getByRole('button', { name: 'Eliminar' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Eliminar libro' }))

    expect(await screen.findByText(`«${TITLE}» ya había sido eliminado`)).toBeInTheDocument()
    await waitFor(() => expect(getCurrentLocation()).toBe('/'))
  })
})

describe('The row actions menu', () => {
  it('deletes a book after confirmation', async () => {
    deleteApi()
    const { user } = renderWithProviders(<App />)

    const menu = await openRowMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Eliminar…' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Eliminar libro' }))

    expect(await screen.findByText('Todavía no hay libros en el catálogo.')).toBeInTheDocument()
  })

  it('returns focus to the menu button on cancel', async () => {
    deleteApi()
    const { user } = renderWithProviders(<App />)

    const menu = await openRowMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Eliminar…' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: `Acciones para «${TITLE}»` })).toHaveFocus(),
    )
  })

  it('moves focus to the catalog heading once the row is gone', async () => {
    deleteApi()
    const { user } = renderWithProviders(<App />)

    const menu = await openRowMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Eliminar…' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Eliminar libro' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toHaveFocus(),
    )
  })

  it('goes to the previous page when it deletes the last book of a page', async () => {
    const others = Array.from({ length: 20 }, (_, index) =>
      makeBook({ id: index + 10, title: `Libro ${index + 10}`, isbn: `isbn-${index}` }),
    )
    deleteApi(undefined, others)
    const { user } = renderWithProviders(<App />, { route: '/?page=3' })

    const menu = await openRowMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Eliminar…' }))
    await user.click(within(await confirmation()).getByRole('button', { name: 'Eliminar libro' }))

    await waitFor(() => expect(getCurrentLocation()).toBe('/?page=2'))
    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
  })

  it.each([
    ['Ver ficha', '/books/1'],
    ['Editar', '/books/1/edit'],
  ])('opens "%s"', async (item, path) => {
    deleteApi()
    const { user } = renderWithProviders(<App />)

    const menu = await openRowMenu(user)
    await user.click(within(menu).getByRole('menuitem', { name: item }))

    await waitFor(() => expect(getCurrentLocation()).toBe(path))
  })
})
