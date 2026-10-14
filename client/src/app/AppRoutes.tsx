import { Route, Routes } from 'react-router'
import { AuthSessionProvider } from '../features/auth/AuthSessionProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { HomePage } from '../features/system/HomePage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'

/** Rutas en modo declarativo, bajo la sesión. Las pantallas de negocio se agregan como rutas hijas del shell. */
export function AppRoutes() {
  return (
    <AuthSessionProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthSessionProvider>
  )
}
