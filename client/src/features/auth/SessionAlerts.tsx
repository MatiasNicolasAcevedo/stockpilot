import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import { Link as RouterLink, useLocation } from 'react-router'
import { ErrorAlert } from '../../shared/ui/ErrorAlert'
import { useSession } from './sessionContext'

/** Avisos de sesión sobre el contenido. Ninguno redirige: cada uno ofrece la acción explícita que corresponde. */
export function SessionAlerts() {
  const session = useSession()
  const { pathname } = useLocation()

  return (
    <>
      {session.sessionEnded ? (
        <Alert
          severity="warning"
          action={
            pathname === '/login' ? undefined : (
              <Button color="inherit" size="small" component={RouterLink} to="/login">
                Ingresar
              </Button>
            )
          }
        >
          La sesión terminó. Volvé a ingresar.
        </Alert>
      ) : null}
      {session.sessionError ? (
        <ErrorAlert
          error={session.sessionError}
          title="No se pudo verificar tu sesión"
          onRetry={session.retrySession}
        />
      ) : null}
      {session.csrfError ? (
        <ErrorAlert
          error={session.csrfError}
          title="No se pudo preparar la protección de la sesión"
          onRetry={session.retryCsrf}
        />
      ) : null}
      {session.logoutError ? (
        <ErrorAlert
          error={session.logoutError}
          title="No se pudo confirmar el cierre de sesión"
          onRetry={session.logoutPending ? undefined : session.logout}
        />
      ) : null}
    </>
  )
}
