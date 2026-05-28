import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/lib/router'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from './context/theme-provider'
import { FontProvider } from './context/font-provider'
import { DirectionProvider } from './context/direction-provider'
// Styles
import './styles/index.css'

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <FontProvider>
              <DirectionProvider>
                <RouterProvider router={router} />
              </DirectionProvider>
            </FontProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
