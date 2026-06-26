// F-10: Zustand store for Meal Planner
import { create } from 'zustand'
import type { MealPlan } from '../types'
import { getWeekStart, subscribeMealPlan, setMealSlot } from '../lib/mealPlanService'

interface MealPlanStore {
  plan: MealPlan | null
  weekStart: number
  loading: boolean
  unsubscribe: (() => void) | null

  init: (userId: string, weekStart?: number) => void
  goToWeek: (userId: string, weekStart: number) => void
  teardown: () => void
  setSlot: (userId: string, slotKey: string, entry: MealPlan['slots'][string] | null) => Promise<void>
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  plan: null,
  weekStart: getWeekStart(),
  loading: true,
  unsubscribe: null,

  init: (userId, weekStart) => {
    const ws = weekStart ?? getWeekStart()
    get().teardown()
    set({ loading: true, weekStart: ws })
    const unsub = subscribeMealPlan(userId, ws, (plan) => set({ plan, loading: false }))
    set({ unsubscribe: unsub })
  },

  goToWeek: (userId, weekStart) => {
    get().init(userId, weekStart)
  },

  teardown: () => {
    get().unsubscribe?.()
    set({ unsubscribe: null, plan: null })
  },

  setSlot: async (userId, slotKey, entry) => {
    const { weekStart } = get()
    await setMealSlot(userId, weekStart, slotKey, entry)
  },
}))
