import { create } from 'zustand'
import type { PasswordEntry } from '../types'
import {
  subscribePasswords,
  addPasswordEntry,
  updatePasswordEntry,
  deletePasswordEntry,
} from '../lib/passwordService'
import { encrypt, decrypt, saveMasterVerifier, verifyMasterPassword, hasMasterPasswordSet } from '../lib/crypto'

interface PasswordStore {
  entries: PasswordEntry[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null

  // Lock state
  isLocked: boolean
  masterPassword: string | null
  lastActivity: number

  init: (userId: string) => void
  teardown: () => void

  unlock: (master: string) => boolean // returns false if wrong password
  lock: () => void
  checkIdleTimeout: (timeoutMinutes: number) => void
  recordActivity: () => void

  add: (userId: string, site: string, username: string, plainPassword: string, extra: Partial<PasswordEntry>) => Promise<void>
  update: (id: string, site: string, username: string, plainPassword: string, extra: Partial<PasswordEntry>) => Promise<void>
  updateFields: (id: string, fields: Partial<Omit<PasswordEntry, 'id' | 'userId' | 'createdAt'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleFavourite: (id: string, current: boolean) => Promise<void>
  decryptPassword: (encryptedPassword: string) => string | null
}

export const usePasswordStore = create<PasswordStore>((set, get) => ({
  entries: [],
  loading: true,
  error: null,
  unsubscribe: null,
  isLocked: true,
  masterPassword: null,
  lastActivity: Date.now(),

  init: (userId) => {
    get().teardown()
    set({ loading: true, error: null })
    const unsub = subscribePasswords(
      userId,
      (entries) => set({ entries, loading: false, error: null }),
      (err) => set({ loading: false, error: err.code === 'failed-precondition' ? 'index-building' : err.message })
    )
    set({ unsubscribe: unsub })
  },

  teardown: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null, isLocked: true, masterPassword: null })
  },

  unlock: (master) => {
    if (!verifyMasterPassword(master)) return false
    // First time setup — save verifier
    if (!hasMasterPasswordSet()) saveMasterVerifier(master)
    set({ isLocked: false, masterPassword: master, lastActivity: Date.now() })
    return true
  },

  lock: () => set({ isLocked: true, masterPassword: null }),

  checkIdleTimeout: (timeoutMinutes) => {
    const { lastActivity, isLocked } = get()
    if (isLocked) return
    const idleMs = Date.now() - lastActivity
    if (idleMs > timeoutMinutes * 60 * 1000) {
      get().lock()
    }
  },

  recordActivity: () => set({ lastActivity: Date.now() }),

  add: async (userId, site, username, plainPassword, extra) => {
    const { masterPassword } = get()
    if (!masterPassword) throw new Error('Not unlocked')
    const encryptedPassword = encrypt(plainPassword, masterPassword)
    const payload: Parameters<typeof addPasswordEntry>[1] = {
      site,
      username,
      encryptedPassword,
      notes: extra.notes || '',
      tags: extra.tags || [],
      isFavourite: extra.isFavourite || false,
    }
    if (extra.expiresAt !== undefined) payload.expiresAt = extra.expiresAt
    await addPasswordEntry(userId, payload)
  },

  update: async (id, site, username, plainPassword, extra) => {
    const { masterPassword } = get()
    if (!masterPassword) throw new Error('Not unlocked')
    const encryptedPassword = encrypt(plainPassword, masterPassword)
    await updatePasswordEntry(id, { site, username, encryptedPassword, ...extra })
  },

  remove: async (id) => { await deletePasswordEntry(id) },

  updateFields: async (id, fields) => {
    await updatePasswordEntry(id, fields)
  },

  toggleFavourite: async (id, current) => { await updatePasswordEntry(id, { isFavourite: !current }) },

  decryptPassword: (encryptedPassword) => {
    const { masterPassword } = get()
    if (!masterPassword) return null
    return decrypt(encryptedPassword, masterPassword)
  },
}))
