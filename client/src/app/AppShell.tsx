import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Fragment } from 'react'
import { Link as RouterLink, Outlet } from 'react-router'
import { SessionAlerts } from '../features/auth/SessionAlerts'
import { SessionControls } from '../features/auth/SessionControls'
import { useSession } from '../features/auth/sessionContext'

/**
 * Estructura común: barra superior con la sesión y contenido. Las rutas se remontan al cambiar la identidad, así que
 * el estado local de una pantalla nunca pasa de un usuario a otro. Comercio activo y rol se suman en M1.
 */
export function AppShell() {
  const { status, user } = useSession()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            variant="h6"
            sx={{ fontWeight: 600, flexShrink: 0 }}
          >
            StockPilot
          </Link>
          <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <SessionControls />
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: { xs: 3, sm: 5 } }}>
        <Stack spacing={3}>
          <SessionAlerts />
          {status === 'loading' ? (
            <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} aria-hidden />
              <Typography>Verificando sesión…</Typography>
            </Stack>
          ) : (
            <Fragment key={user?.id ?? 'visitor'}>
              <Outlet />
            </Fragment>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
