import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Address, Me, Schemas } from './types'

export function useAddresses(enabled = true) {
  return useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/api/users/me/addresses'), enabled })
}

export function useSaveAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Schemas['AddressRequest'] }) =>
      id
        ? api<Address>(`/api/users/me/addresses/${id}`, { method: 'PUT', body })
        : api<Address>('/api/users/me/addresses', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<null>(`/api/users/me/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })
}

export function useUpdateMe() {
  return useMutation({
    mutationFn: (body: Schemas['UpdateMeRequest']) => api<Me>('/api/users/me', { method: 'PUT', body }),
  })
}
