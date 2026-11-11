import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router'

import { Toaster } from '../components/ui/Toaster'

function CurrentLocation() {
  const { pathname, search } = useLocation()
  return <output data-testid="current-location" hidden>{`${pathname}${search}`}</output>
}

/** Renders inside a router (starting at `route`) and a fresh, retry-free query client. */
export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
          <CurrentLocation />
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

/** Path and query string of the router after the interactions so far. */
export function getCurrentLocation(): string {
  return screen.getByTestId('current-location').textContent ?? ''
}
