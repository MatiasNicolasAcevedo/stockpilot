import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Toolbar from '@mui/material/Toolbar'
import { Link as RouterLink, Outlet } from 'react-router'

/** Estructura común: barra superior y contenido. Comercio activo, rol y sesión se suman en T-002/M1. */
export function AppShell() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            underline="none"
            variant="h6"
            sx={{ fontWeight: 600 }}
          >
            StockPilot
          </Link>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: { xs: 3, sm: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
