import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, ShoppingCart } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useMealPlanStore, DAY_KEYS, getWeekStart } from '../stores/mealPlanStore'
import type { DayKey } from '../stores/mealPlanStore'
import type { MealSlotType } from '../types'

const MEAL_TYPES: MealSlotType[] = ['breakfast', 'lunch', 'dinner']

const MEAL_LABELS: Record<MealSlotType, { zh: string; en: string }> = {
  breakfast: { zh: '早餐', en: 'Breakfast' },
  lunch: { zh: '午餐', en: 'Lunch' },
  dinner: { zh: '晚餐', en: 'Dinner' },
}

const DAY_LABELS: Record<DayKey, { zh: string; en: string }> = {
  Mon: { zh: '一', en: 'Mon' },
  Tue: { zh: '二', en: 'Tue' },
  Wed: { zh: '三', en: 'Wed' },
  Thu: { zh: '四', en: 'Thu' },
  Fri: { zh: '五', en: 'Fri' },
  Sat: { zh: '六', en: 'Sat' },
  Sun: { zh: '日', en: 'Sun' },
}

interface PickerState {
  day: DayKey
  mealType: MealSlotType
}

function formatWeekRange(weekStart: number, lang: string) {
  const start = new Date(weekStart)
  const end = new Date(weekStart + 6 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) =>
    lang === 'zh'
      ? `${d.getMonth() + 1}/${d.getDate()}`
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export default function MealPlannerPage() {
  const { t, user, settings } = useAppStore()
  const lang = settings.language
  const navigate = useNavigate()

  const { recipes, init: initRecipes, teardown } = useRecipeStore()
  const { plan, weekStart, loading, loadWeek, addSlot, removeSlot, goToPrevWeek, goToNextWeek } = useMealPlanStore()

  const [picker, setPicker] = useState<PickerState | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) {
      initRecipes(user.uid)
      loadWeek(user.uid, getWeekStart(new Date()))
    }
    return () => teardown()
  }, [user?.uid])

  const filteredRecipes = recipes.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddSlot = async (recipeId: string, recipeTitle: string) => {
    if (!picker) return
    await addSlot(picker.day, { type: picker.mealType, recipeId, recipeTitle })
    setPicker(null)
    setSearch('')
  }

  // Add all recipe ingredients for the week to shopping list
  const handleAddWeekToShopping = async () => {
    const recipeIds = new Set<string>()
    if (plan) {
      for (const slots of Object.values(plan.days)) {
        for (const slot of slots) recipeIds.add(slot.recipeId)
      }
    }
    for (const r of recipes) {
      if (recipeIds.has(r.id)) {
        const updated = r.ingredients.map((ing) => ({ ...ing, inShoppingList: true }))
        // We update via recipeStore
        const { update } = useRecipeStore.getState()
        await update(r.id, { ingredients: updated })
      }
    }
    navigate('/shopping')
  }

  const isCurrentWeek = weekStart === getWeekStart(new Date())

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/recipes')}>
          <ChevronLeft size={22} />
        </button>
        <h1>{lang === 'zh' ? '週計劃' : 'Meal Planner'}</h1>
        <button
          className="icon-btn"
          title={lang === 'zh' ? '加入購物清單' : 'Add to Shopping List'}
          onClick={handleAddWeekToShopping}
        >
          <ShoppingCart size={20} />
        </button>
      </header>

      {/* Week Navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 4px', gap: 8,
      }}>
        <button className="icon-btn" onClick={goToPrevWeek}><ChevronLeft size={18} /></button>
        <span style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 600 }}>
          {isCurrentWeek && (lang === 'zh' ? '本週 · ' : 'This Week · ')}
          {formatWeekRange(weekStart, lang)}
        </span>
        <button className="icon-btn" onClick={goToNextWeek}><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-3)' }}>
          {t('common', 'loading')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', padding: '8px 16px 16px' }}>
          {/* Grid: rows = meal types, cols = days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `64px repeat(7, minmax(90px, 1fr))`,
            gap: 4,
            minWidth: 700,
          }}>
            {/* Header row */}
            <div />
            {DAY_KEYS.map((day) => (
              <div key={day} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 700,
                color: 'var(--color-text-2)', padding: '4px 2px',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {DAY_LABELS[day][lang]}
              </div>
            ))}

            {/* Meal rows */}
            {MEAL_TYPES.map((mealType) => (
              <>
                <div key={mealType} style={{
                  display: 'flex', alignItems: 'flex-start', paddingTop: 10,
                  fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                  textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  {MEAL_LABELS[mealType][lang]}
                </div>
                {DAY_KEYS.map((day) => {
                  const slots = (plan?.days[day] || []).filter((s) => s.type === mealType)
                  return (
                    <div key={day + mealType} style={{
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: 6,
                      minHeight: 70,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}>
                      {slots.map((slot, idx) => {
                        // BUG-39 FIX: Calculate global index by counting how many
                        // slots of this mealType appear before position idx
                        // among ALL day slots (not just filtered ones).
                        let count = 0
                        const globalIdx = (plan?.days[day] || []).findIndex((s) => {
                          if (s.type === mealType) {
                            if (count === idx) return true
                            count++
                          }
                          return false
                        })
                        return (
                          <div key={idx} style={{
                            background: 'var(--color-recipe-light)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 6px',
                            fontSize: 11,
                            color: 'var(--color-recipe)',
                            display: 'flex', alignItems: 'flex-start', gap: 2,
                            lineHeight: 1.3,
                          }}>
                            <span style={{ flex: 1 }}>{slot.recipeTitle}</span>
                            <button
                              onClick={() => removeSlot(day, globalIdx)}
                              style={{ color: 'var(--color-text-3)', flexShrink: 0, padding: 1 }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )
                      })}
                      <button
                        onClick={() => setPicker({ day, mealType })}
                        style={{
                          marginTop: 'auto',
                          color: 'var(--color-text-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 2, borderRadius: 4,
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Picker Modal */}
      {picker && (
        <div className="modal-overlay" onClick={() => { setPicker(null); setSearch('') }}>
          <div className="modal modal-tall" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16 }}>
                {lang === 'zh'
                  ? `選擇食譜 · ${DAY_LABELS[picker.day].zh} ${MEAL_LABELS[picker.mealType].zh}`
                  : `Pick Recipe · ${DAY_LABELS[picker.day].en} ${MEAL_LABELS[picker.mealType].en}`}
              </h2>
              <button className="icon-btn" onClick={() => { setPicker(null); setSearch('') }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <input
                className="input-field"
                placeholder={lang === 'zh' ? '搜尋食譜...' : 'Search recipes...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredRecipes.length === 0 && (
                  <p style={{ color: 'var(--color-text-3)', textAlign: 'center', padding: 24 }}>
                    {t('common', 'noResults')}
                  </p>
                )}
                {filteredRecipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAddSlot(r.id, r.title)}
                    style={{
                      textAlign: 'left', padding: '10px 12px',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14, color: 'var(--color-text)',
                      transition: 'background 0.1s',
                    }}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
