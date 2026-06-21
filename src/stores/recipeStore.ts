import { create } from 'zustand'
import type { Recipe } from '../types'
import { subscribeRecipes, addRecipe, updateRecipe, deleteRecipe } from '../lib/recipeService'

interface RecipeStore {
  recipes: Recipe[]
  loading: boolean
  error: string | null
  unsubscribe: (() => void) | null

  init: (userId: string) => void
  teardown: () => void
  add: (userId: string, data: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  update: (id: string, data: Partial<Recipe>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleFavourite: (id: string, current: boolean) => Promise<void>
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  loading: true,
  error: null,
  unsubscribe: null,

  init: (userId) => {
    get().teardown()
    set({ loading: true, error: null })
    const unsub = subscribeRecipes(
      userId,
      (recipes) => set({ recipes, loading: false, error: null }),
      (err) => set({ loading: false, error: err.code === 'failed-precondition' ? 'index-building' : err.message })
    )
    set({ unsubscribe: unsub })
  },

  teardown: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null })
  },

  add: async (userId, data) => { await addRecipe(userId, data) },
  update: async (id, data) => { await updateRecipe(id, data) },
  remove: async (id) => { await deleteRecipe(id) },
  toggleFavourite: async (id, current) => { await updateRecipe(id, { isFavourite: !current }) },
}))
