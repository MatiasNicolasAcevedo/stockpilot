import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'

type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'error' | 'inputRef'
> & {
  name: Path<T>
  control: Control<T>
}

/**
 * TextField de MUI controlado por React Hook Form. El error (de Zod o del servidor) se muestra como helperText, que MUI
 * enlaza con aria-describedby, y el input queda aria-invalid.
 */
export function FormTextField<T extends FieldValues>({
  name,
  control,
  helperText,
  ...props
}: FormTextFieldProps<T>) {
  const {
    field: { ref, value, ...field },
    fieldState: { error },
  } = useController({ name, control })

  return (
    <TextField
      {...props}
      {...field}
      value={value ?? ''}
      inputRef={ref}
      error={error !== undefined}
      helperText={error?.message ?? helperText}
    />
  )
}
