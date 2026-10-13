import { useState } from 'react'
import { BrowserRouter } from 'react-router'
import { AppProviders } from './AppProviders'
import { AppRoutes } from './AppRoutes'
import { createQueryClient } from './queryClient'

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <AppProviders queryClient={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
