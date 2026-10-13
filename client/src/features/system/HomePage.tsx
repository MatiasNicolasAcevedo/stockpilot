import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { SystemInfoPanel } from './SystemInfoPanel'

export function HomePage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" component="h1">
          Bienvenido a StockPilot
        </Typography>
        <Typography color="text.secondary">
          Inventario y ventas para pequeños comercios: productos, existencias y ventas de cada
          comercio, sin mezclar datos entre comercios.
        </Typography>
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h2">
              Estado del servidor
            </Typography>
            <SystemInfoPanel />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
