import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SessionProvider } from './features/auth/session'
import { BagProvider } from './features/cart/BagContext'
import { CartProvider } from './features/cart/CartProvider'
import './fonts'
import './styles/index.css'
import { createQueryClient } from './queryClient'
import { ToastProvider } from './ui/Toast'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <CartProvider>
          <BrowserRouter>
            <ToastProvider>
              <BagProvider>
                <App />
              </BagProvider>
            </ToastProvider>
          </BrowserRouter>
        </CartProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
