import { useQuery } from '@tanstack/react-query'
import { fetchSystemInfo, systemQueryKeys } from './api'

export function useSystemInfo() {
  return useQuery({
    queryKey: systemQueryKeys.info,
    queryFn: ({ signal }) => fetchSystemInfo(signal),
  })
}
