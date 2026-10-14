import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { GOOGLE_LOGIN_PATH } from './api'
import { sessionLabel, useSession } from './sessionContext'

/**
 * Ingreso con Google. El botón es un enlace (navegación completa same-origin): el backend hace todo el flujo OIDC.
 * Ante `?error=authentication` muestra un mensaje fijo; ningún otro parámetro de la URL se refleja.
 */
export function LoginPage() {
  const { status, user } = useSession()
  const [searchParams] = useSearchParams()
  const failed = searchParams.get('error') === 'authentication'

  if (status === 'authenticated' && user) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          Ya iniciaste sesión
        </Typography>
        <Typography>Estás usando StockPilot como {sessionLabel(user)}.</Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Ir al inicio
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 480 }}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          Ingresar a StockPilot
        </Typography>
        <Typography color="text.secondary">
          Usá tu cuenta de Google. StockPilot no recibe ni guarda tu contraseña.
        </Typography>
      </Stack>
      {failed ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" href={GOOGLE_LOGIN_PATH}>
              Reintentar
            </Button>
          }
        >
          <AlertTitle>No se pudo iniciar sesión</AlertTitle>
          El ingreso con Google se canceló o no se pudo completar. Podés volver a intentarlo.
        </Alert>
      ) : null}
      <Button
        variant="contained"
        size="large"
        href={GOOGLE_LOGIN_PATH}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
      >
        Continuar con Google
      </Button>
    </Stack>
  )
}
