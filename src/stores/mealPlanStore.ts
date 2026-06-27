import { create } from 'zustand'
import type { MealPlan, MealSlot } from '../types'
import { getMealPlan, saveMealPlan } from '../lib/mealPlanService'

// Get Monday of the week containing `date`
export function getWeekStart(date: Date): number {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

interface MealPlanStore {
  plan: MealPlan | null
  weekStart: number
  loading: boolean
  userId: string | null

  loadWeek: (userId: string, weekStart: number) => Promise<void>
  addSlot: (day: DayKey, slot: MealSlot) => Promise<void>
  removeSlot: (day: DayKey, slotIndex: number) => Promise<void>
  goToPrevWeek: () => void
  goToNextWeek: () => void
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  plan: null,
  weekStart: getWeekStart(new Date()),
  loading: false,
  userId: null,

  loadWeek: async (userId, weekStart) => {
    set({ loading: true, userId, weekStart })
    const plan = await getMealPlan(userId, weekStart)
    set({ plan, loading: false })
  },

  addSlot: async (day, slot) => {
    const { plan, weekStart, userId } = get()
    if (!userId) return
    const days = plan ? { ...plan.days } : {}
    days[day] = [...(days[day] || []), slot]
    await saveMealPlan(userId, weekStart, days)
    set({ plan: plan ? { ...plan, days } : { id: '', userId, weekStart, days, createdAt: Date.now(), updatedAt: Date.now() } })
  },

  removeSlot: async (day, slotIndex) => {
    const { plan, weekStart, userId } = get()
    if (!userId || !plan) return
    const days = { ...plan.days }
    days[day] = (days[day] || []).filter((_, i) => i !== slotIndex)
    await saveMealPlan(userId, weekStart, days)
    set({ plan: { ...plan, days } })
  },

  goToPrevWeek: () => {
    const { weekStart, userId } = get()
    const prev = weekStart - 7 * 24 * 60 * 60 * 1000
    if (userId) get().loadWeek(userId, prev)
  },

  goToNextWeek: () => {
    const { weekStart, userId } = get()
    const next = weekStart + 7 * 24 * 60 * 60 * 1000
    if (userId) get().loadWeek(userId, next)
  },
}))
