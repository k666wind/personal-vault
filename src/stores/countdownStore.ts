import { create } from 'zustand'
import type { DateCountdown } from '../types'
import {
  subscribeCountdowns, addCountdown, updateCountdown, deleteCountdown
} from '../lib/countdownService'

interface CountdownStore {
  items: DateCountdown[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null

  subscribe: (userId: string) => void
  cleanup: () => void
  add: (userId: string, data: Omit<DateCountdown, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, data: Partial<Omit<DateCountdown, 'id' | 'userId' | 'createdAt'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useCountdownStore = create<CountdownStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  unsubscribe: null,

  subscribe: (userId) => {
    get().cleanup()
    set({ loading: true, error: null })
    const unsub = subscribeCountdowns(
      userId,
      (items) => set({ items, loading: false, error: null }),
      (err) => set({ error: err.message, loading: false })
    )
    set({ unsubscribe: unsub })
  },

  cleanup: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null })
  },

  add: async (userId, data) => {
    await addCountdown(userId, data)
  },

  update: async (id, data) => {
    await updateCountdown(id, data)
  },

  remove: async (id) => {
    await deleteCountdown(id)
  },
}))
