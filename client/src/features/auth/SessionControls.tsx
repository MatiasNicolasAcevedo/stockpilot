import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useLocation } from 'react-router'
import { sessionLabel, useSession } from './sessionContext'

/** Estado de sesión en la barra superior: usuario con «Cerrar sesión» o acceso al ingreso. Sin roles ni comercio. */
export function SessionControls() {
  const { status, user, logout, logoutPending, csrfReady } = useSession()
  const { pathname } = useLocation()

  if (status === 'authenticated' && user) {
    const label = sessionLabel(user)
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography noWrap title={label} sx={{ minWidth: 0 }}>
          {label}
        </Typography>
        <Button
          color="inherit"
          variant="outlined"
          size="small"
          onClick={logout}
          disabled={logoutPending || !csrfReady}
          sx={{ flexShrink: 0 }}
        >
          {logoutPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </Stack>
    )
  }

  if (status === 'visitor' && pathname !== '/login') {
    return (
      <Button color="inherit" component={RouterLink} to="/login">
        Ingresar
      </Button>
    )
  }

  return null
}
