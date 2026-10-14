import { useMutation, useQuery } from '@tanstack/react-query'
import { authQueryKeys, fetchCurrentUser, logout } from './api'

/**
 * Sesión actual: `data` es el usuario o null (visitante). Se revalida siempre al recuperar el foco; 401/403 no se
 * reintentan (app/queryClient).
 */
export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    refetchOnWindowFocus: 'always',
  })
}

/** Mutación de logout, sin reintentos ni reenvío automático. Sus efectos sobre cache y navegación los define la UI. */
export function useLogout() {
  return useMutation({ mutationFn: logout, retry: false })
}
