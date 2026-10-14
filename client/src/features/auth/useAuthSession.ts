import { useMutation, useQuery } from '@tanstack/react-query'
import { authQueryKeys, fetchCurrentUser, logout, renewCsrf, type AuthUser } from './api'

/**
 * Sesión actual: `data` es el usuario o null (visitante). Se revalida siempre al recuperar el foco; 401/403 no se
 * reintentan (app/queryClient). `beforePublish` recibe cada resultado antes de que llegue a la cache: es el único
 * punto en que la UI de sesión puede descartar datos de otra identidad antes de que se rendericen.
 */
export function useAuthSession(beforePublish?: (user: AuthUser | null) => void) {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: async ({ signal }) => {
      const user = await fetchCurrentUser(signal)
      beforePublish?.(user)
      return user
    },
    refetchOnWindowFocus: 'always',
  })
}

/**
 * Token CSRF materializado en la cookie (GET csrf). `isSuccess` sin `isFetching` habilita mutaciones. Solo se vuelve a
 * pedir de forma explícita (al montar, tras autenticar o cerrar sesión); el valor vive en la cookie, no en la cache.
 */
export function useCsrfToken() {
  return useQuery({
    queryKey: authQueryKeys.csrf,
    queryFn: async ({ signal }) => {
      await renewCsrf(signal)
      return true
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

/** Mutación de logout, sin reintentos ni reenvío automático. Sus efectos sobre cache y navegación los define la UI. */
export function useLogout() {
  return useMutation({ mutationFn: logout, retry: false })
}
