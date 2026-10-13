import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildSystemInfo } from '../../test/factories'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { SystemInfoPanel } from './SystemInfoPanel'

const INFO = '/api/v1/system/info'

describe('SystemInfoPanel (T1-02)', () => {
  it('muestra nombre y versión obtenidos del backend', async () => {
    server.use(http.get(INFO, () => HttpResponse.json(buildSystemInfo({ version: '9.8.7' }))))

    renderWithProviders(<SystemInfoPanel />)

    expect(screen.getByRole('status')).toHaveTextContent('Consultando el servidor…')
    expect(await screen.findByText('StockPilot · versión 9.8.7')).toBeInTheDocument()
    expect(screen.getByText('Servidor conectado')).toBeInTheDocument()
  })

  it.each([502, 504])('con el proxy en %i muestra error y permite reintentar', async (status) => {
    server.use(
      http.get(INFO, () => new HttpResponse('Upstream unavailable', { status }), { once: true }),
    )

    const { user } = renderWithProviders(<SystemInfoPanel />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo obtener el estado del servidor')
    expect(alert).toHaveTextContent('El servidor no está disponible en este momento')
    expect(screen.queryByText(/versión/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('StockPilot · versión 0.0.1-TEST')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin red muestra el error de conexión y «Reintentar» recupera el dato', async () => {
    server.use(http.get(INFO, () => HttpResponse.error(), { once: true }))

    const { user } = renderWithProviders(<SystemInfoPanel />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('StockPilot · versión 0.0.1-TEST')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
