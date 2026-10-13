import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ErrorAlert } from '../../shared/ui/ErrorAlert'
import { useSystemInfo } from './useSystemInfo'

/** Estado de la conexión con el server: el dato mostrado proviene siempre de la API, nunca del bundle. */
export function SystemInfoPanel() {
  const { data, error, isPending, isError, isFetching, refetch } = useSystemInfo()

  if (isPending) {
    return (
      <Stack direction="row" spacing={1.5} role="status" sx={{ alignItems: 'center' }}>
        <CircularProgress size={20} aria-hidden />
        <Typography>Consultando el servidor…</Typography>
      </Stack>
    )
  }

  if (isError) {
    return (
      <ErrorAlert
        error={error}
        title="No se pudo obtener el estado del servidor"
        onRetry={isFetching ? undefined : () => void refetch()}
      />
    )
  }

  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      role="status"
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Chip label="Servidor conectado" color="success" size="small" />
      <Typography>
        {data.name} · versión {data.version}
      </Typography>
    </Stack>
  )
}
