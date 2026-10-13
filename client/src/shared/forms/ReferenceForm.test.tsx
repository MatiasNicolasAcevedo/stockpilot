import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { screen } from '@testing-library/react'
import { http as mock, HttpResponse } from 'msw'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { http } from '../../services/http'
import { problemResponse, validationProblemResponse } from '../../test/factories'
import { server } from '../../test/msw/server'
import { renderWithProviders } from '../../test/render'
import { ErrorAlert } from '../ui/ErrorAlert'
import { applyServerFieldErrors } from './applyServerFieldErrors'
import { FormTextField } from './FormTextField'

// Formulario de referencia solo de prueba (T1-04): muestra el patrón RHF + Zod + errores del servidor sin inventar
// una funcionalidad de negocio. Las pantallas reales copian esta forma.
const PATH = '/api/v1/test/reference-form'
const FIELDS = ['name', 'code'] as const

const referenceSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre.'),
  code: z.string().trim().max(10, 'Usá hasta 10 caracteres.'),
})
type ReferenceValues = z.infer<typeof referenceSchema>

function ReferenceForm() {
  const [saved, setSaved] = useState(false)
  const [requestError, setRequestError] = useState<unknown>(null)
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReferenceValues>({
    resolver: zodResolver(referenceSchema),
    defaultValues: { name: '', code: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false)
    setRequestError(null)
    try {
      await http.requestVoid(PATH, { method: 'POST', body: values })
      setSaved(true)
    } catch (error) {
      if (!applyServerFieldErrors(error, setError, FIELDS)) setRequestError(error)
    }
  })

  return (
    <Stack component="form" noValidate onSubmit={onSubmit} spacing={2}>
      {errors.root?.server ? <Alert severity="error">{errors.root.server.message}</Alert> : null}
      {requestError ? <ErrorAlert error={requestError} /> : null}
      {saved ? <Alert severity="success">Guardado.</Alert> : null}
      <FormTextField control={control} name="name" label="Nombre" required />
      <FormTextField control={control} name="code" label="Código" helperText="Opcional" />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        Guardar
      </Button>
    </Stack>
  )
}

describe('Formulario de referencia (T1-04)', () => {
  it('valida en el cliente junto al campo sin llamar al servidor', async () => {
    let calls = 0
    server.use(
      mock.post(PATH, () => {
        calls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<ReferenceForm />)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const name = screen.getByRole('textbox', { name: /Nombre/ })
    expect(name).toHaveAccessibleDescription('Ingresá un nombre.')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveFocus()
    expect(calls).toBe(0)
  })

  it('muestra los errores de validación del servidor junto a su campo', async () => {
    server.use(
      mock.post(PATH, () =>
        validationProblemResponse([
          { field: 'code', message: 'Ya existe un registro con ese código.' },
          { field: 'name', message: 'El nombre está reservado.' },
          { field: 'other', message: 'Revisá los datos generales.' },
        ]),
      ),
    )
    const { user } = renderWithProviders(<ReferenceForm />)

    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Registro de prueba')
    await user.type(screen.getByRole('textbox', { name: /Código/ }), 'R-1')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const code = screen.getByRole('textbox', { name: /Código/ })
    expect(await screen.findByText('Ya existe un registro con ese código.')).toBeInTheDocument()
    expect(code).toHaveAccessibleDescription('Ya existe un registro con ese código.')
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveFocus()
    expect(screen.getByRole('textbox', { name: /Nombre/ })).toHaveAccessibleDescription(
      'El nombre está reservado.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá los datos generales.')
    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument()
  })

  it('un error sin errores de campo se muestra como error general', async () => {
    server.use(mock.post(PATH, () => problemResponse(500, { detail: 'Detalle interno' })))
    const { user } = renderWithProviders(<ReferenceForm />)

    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), 'Registro de prueba')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('El servidor no está disponible en este momento')
    expect(alert).not.toHaveTextContent('Detalle interno')
  })

  it('confirma el éxito solo cuando el servidor guardó', async () => {
    let body: unknown
    server.use(
      mock.post(PATH, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<ReferenceForm />)

    await user.type(screen.getByRole('textbox', { name: /Nombre/ }), '  Registro de prueba ')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Guardado.')).toBeInTheDocument()
    expect(body).toEqual({ name: 'Registro de prueba', code: '' })
  })
})
