import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Condominium } from '@/types/database.types'

interface AppStore {
  selectedCondo: Condominium | null
  setSelectedCondo: (condo: Condominium | null) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedCondo: null,
      setSelectedCondo: (condo) => set({ selectedCondo: condo }),
    }),
    { name: 'sindico-pro-store' }
  )
)
