import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h4" component="h1">
        No encontramos esta página
      </Typography>
      <Typography color="text.secondary">
        La dirección no existe o cambió. Volvé al inicio para continuar.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Volver al inicio
      </Button>
    </Stack>
  )
}
