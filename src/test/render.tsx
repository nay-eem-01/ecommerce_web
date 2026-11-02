import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider } from '../features/auth/session'
import { createQueryClient } from '../queryClient'
import { ToastProvider } from '../ui/Toast'

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname + location.search}</output>
}

/** Renders `ui` with the app's providers at `path`; `screen.getByTestId('path')` shows where it navigated. */
export function renderWithProviders(ui: ReactNode, path = '/') {
  const queryClient = createQueryClient()
  const defaults = queryClient.getDefaultOptions()
  queryClient.setDefaultOptions({ queries: { ...defaults.queries, retry: false }, mutations: { retry: false } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            {ui}
            <Routes>
              <Route path="*" element={<CurrentPath />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  )
}

/** A signed-in session: stores a refresh token so the provider restores it through the mocked refresh call. */
export function storeSession() {
  localStorage.setItem('senpai.refreshToken', 'refresh-1')
}
