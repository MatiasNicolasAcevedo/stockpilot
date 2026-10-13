import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import { errorMessage } from './errorMessage'

interface ErrorAlertProps {
  error: unknown
  title?: string
  /** Si se indica, muestra la acción «Reintentar». */
  onRetry?: () => void
}

export function ErrorAlert({ error, title, onRetry }: ErrorAlertProps) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {errorMessage(error)}
    </Alert>
  )
}
