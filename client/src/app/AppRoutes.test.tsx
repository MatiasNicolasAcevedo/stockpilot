import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/render'
import { AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it('la ruta inicial muestra el shell de StockPilot con el estado real del servidor', async () => {
    renderWithProviders(<AppRoutes />)

    expect(screen.getByRole('link', { name: 'StockPilot' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenido a StockPilot' })).toBeVisible()
    expect(await screen.findByText('StockPilot · versión 0.0.1-TEST')).toBeInTheDocument()
  })

  it('una ruta desconocida muestra la página no encontrada con vuelta al inicio', async () => {
    const { user } = renderWithProviders(<AppRoutes />, { route: '/no-existe' })

    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Volver al inicio' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenido a StockPilot' })).toBeVisible()
    expect(await screen.findByText(/versión/)).toBeInTheDocument()
  })
})
