import { create } from 'zustand'
import type { Note } from '../types'
import { subscribeNotes, addNote, updateNote, deleteNote } from '../lib/noteService'

interface NoteStore {
  notes: Note[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null

  init: (userId: string) => void
  teardown: () => void
  add: (userId: string, data: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, data: Partial<Note>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleFavourite: (id: string, current: boolean) => Promise<void>
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  loading: true,
  error: null,
  unsubscribe: null,

  init: (userId) => {
    get().teardown()
    set({ loading: true, error: null })
    const unsub = subscribeNotes(
      userId,
      (notes) => set({ notes, loading: false, error: null }),
      (err) => set({ loading: false, error: err.code === 'failed-precondition' ? 'index-building' : err.message })
    )
    set({ unsubscribe: unsub })
  },

  teardown: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null })
  },

  add: async (userId, data) => { await addNote(userId, data) },
  update: async (id, data) => { await updateNote(id, data) },
  remove: async (id) => { await deleteNote(id) },
  toggleFavourite: async (id, current) => { await updateNote(id, { isFavourite: !current }) },
}))
