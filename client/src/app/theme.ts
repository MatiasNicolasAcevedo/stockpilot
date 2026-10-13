import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'

/** Tema único de StockPilot. Textos internos de MUI en español (paginación, etiquetas por defecto). */
export const theme = createTheme(
  {
    palette: {
      primary: { main: '#1f5f8b' },
      secondary: { main: '#2e7d5b' },
      background: { default: '#f5f7fa' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: [
        'system-ui',
        '-apple-system',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
  },
  esES,
)
