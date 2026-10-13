import { Route, Routes } from 'react-router'
import { HomePage } from '../features/system/HomePage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

/** Rutas en modo declarativo. Las pantallas de negocio se agregan como rutas hijas del shell. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
