import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App'
import { createQueryClient } from './api/queryClient'
import { Toaster } from './components/ui/Toaster'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

const queryClient = createQueryClient()

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
