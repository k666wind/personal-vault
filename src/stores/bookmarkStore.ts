import { create } from 'zustand'
import type { Bookmark } from '../types'
import {
  subscribeBookmarks,
  addBookmark,
  updateBookmark,
  deleteBookmark,
} from '../lib/bookmarkService'

interface BookmarkStore {
  bookmarks: Bookmark[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null

  init: (userId: string) => void
  teardown: () => void

  add: (userId: string, data: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, data: Partial<Bookmark>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleFavourite: (id: string, current: boolean) => Promise<void>
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  loading: true,
  error: null,
  unsubscribe: null,

  init: (userId) => {
    get().teardown()
    set({ loading: true, error: null })
    const unsub = subscribeBookmarks(
      userId,
      (bookmarks) => {
        set({ bookmarks, loading: false, error: null })
      },
      (err: { code?: string; message: string }) => {
        if (err.code === 'failed-precondition') {
          set({ loading: false, error: 'index-building' })
        } else {
          set({ loading: false, error: err.message })
        }
      }
    )
    set({ unsubscribe: unsub })
  },

  teardown: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null })
  },

  add: async (userId, data) => {
    await addBookmark(userId, data)
  },

  update: async (id, data) => {
    await updateBookmark(id, data)
  },

  remove: async (id) => {
    await deleteBookmark(id)
  },

  toggleFavourite: async (id, current) => {
    await updateBookmark(id, { isFavourite: !current })
  },
}))
