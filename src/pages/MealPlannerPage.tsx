// F-10: Meal Planner — weekly calendar view for recipe scheduling
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Plus, ShoppingCart } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useMealPlanStore } from '../stores/mealPlanStore'
import { getWeekStart } from '../lib/mealPlanService'
import type { MealSlot, Recipe } from '../types'

const DAYS: Array<{ key: string; zh: string; en: string }> = [
  { key: 'mon', zh: '週一', en: 'Mon' },
  { key: 'tue', zh: '週二', en: 'Tue' },
  { key: 'wed', zh: '週三', en: 'Wed' },
  { key: 'thu', zh: '週四', en: 'Thu' },
  { key: 'fri', zh: '週五', en: 'Fri' },
  { key: 'sat', zh: '週六', en: 'Sat' },
  { key: 'sun', zh: '週日', en: 'Sun' },
]

const SLOTS: Array<{ key: MealSlot; zh: string; en: string; emoji: string }> = [
  { key: 'breakfast', zh: '早餐', en: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     zh: '午餐', en: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    zh: '晚餐', en: 'Dinner',    emoji: '🌙' },
]

function getWeekDates(weekStart: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function prevWeek(ws: number): number { return ws - 7 * 24 * 60 * 60 * 1000 }
function nextWeek(ws: number): number { return ws + 7 * 24 * 60 * 60 * 1000 }

export default function MealPlannerPage() {
  const { user, settings } = useAppStore()
  const { recipes, init: initRecipes, teardown: tearRecipes } = useRecipeStore()
  const { plan, weekStart, loading, init, goToWeek, teardown, setSlot } = useMealPlanStore()
  const navigate = useNavigate()
  const isEn = settings.language === 'en'

  // Recipe picker state
  const [picking, setPicking] = useState<{ dayKey: string; slot: MealSlot } | null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')

  useEffect(() => {
    if (!user) return
    init(user.uid)
    initRecipes(user.uid)
    return () => { teardown(); tearRecipes() }
  }, [user?.uid])

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  // Aggregate all recipe IDs in this week's plan → for shopping list
  const recipesInPlan = useMemo(() => {
    if (!plan) return []
    const ids = new Set(Object.values(plan.slots).map((s) => s.recipeId))
    return recipes.filter((r) => ids.has(r.id))
  }, [plan, recipes])

  // Send all ingredients of planned recipes to ShoppingList
  const handleAddToShopping = async () => {
    for (const recipe of recipesInPlan) {
      const updated = recipe.ingredients.map((ing) => ({ ...ing, inShoppingList: true }))
      // Use recipeStore update via service layer
      const { update } = useRecipeStore.getState()
      await update(recipe.id, { ingredients: updated })
    }
    navigate('/shopping')
  }

  const filteredRecipes = useMemo(() =>
    recipes.filter((r) =>
      !recipeSearch || r.title.toLowerCase().includes(recipeSearch.toLowerCase())
    ), [recipes, recipeSearch])

  const handlePickRecipe = async (recipe: Recipe) => {
    if (!picking || !user) return
    const slotKey = `${picking.dayKey}-${picking.slot}`
    await setSlot(user.uid, slotKey, { recipeId: recipe.id, recipeName: recipe.title })
    setPicking(null)
    setRecipeSearch('')
  }

  const handleClearSlot = async (dayKey: string, slot: MealSlot) => {
    if (!user) return
    await setSlot(user.uid, `${dayKey}-${slot}`, null)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={22} /></button>
        <h1>{isEn ? 'Meal Planner' : '膳食計劃'}</h1>
        {recipesInPlan.length > 0 && (
          <button className="icon-btn" onClick={handleAddToShopping} title={isEn ? 'Add all to shopping' : '加入購物清單'}>
            <ShoppingCart size={20} style={{ color: 'var(--color-primary)' }} />
          </button>
        )}
      </header>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <button className="icon-btn" onClick={() => user && goToWeek(user.uid, prevWeek(weekStart))}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>
            {weekDates[0].toLocaleDateString(isEn ? 'en-GB' : 'zh-HK', { month: 'short', day: 'numeric' })}
            {' – '}
            {weekDates[6].toLocaleDateString(isEn ? 'en-GB' : 'zh-HK', { month: 'short', day: 'numeric' })}
          </p>
          {weekStart === getWeekStart() && (
            <span style={{ fontSize: 11, color: 'var(--color-primary)' }}>{isEn ? 'This Week' : '本週'}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
            onClick={() => user && goToWeek(user.uid, getWeekStart())}
          >
            {isEn ? 'Today' : '今週'}
          </button>
          <button className="icon-btn" onClick={() => user && goToWeek(user.uid, nextWeek(weekStart))}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-page"><div className="spinner" /></div>
      ) : (
        <div style={{ overflowX: 'auto', padding: '0 16px 80px' }}>
          {/* Grid: days as columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `72px repeat(7, minmax(100px, 1fr))`,
            gap: 6,
            minWidth: 780,
          }}>
            {/* Header row: day labels */}
            <div /> {/* empty corner */}
            {DAYS.map((day, i) => (
              <div key={day.key} style={{
                textAlign: 'center', padding: '6px 4px',
                background: isToday(weekDates[i]) ? 'var(--color-primary)' : 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                color: isToday(weekDates[i]) ? '#fff' : 'var(--color-text)',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700 }}>{isEn ? day.en : day.zh}</p>
                <p style={{ fontSize: 11, opacity: 0.7 }}>
                  {weekDates[i].toLocaleDateString(isEn ? 'en-GB' : 'zh-HK', { day: 'numeric' })}
                </p>
              </div>
            ))}

            {/* Slot rows */}
            {SLOTS.map((slot) => (
              <>
                {/* Row label */}
                <div key={`label-${slot.key}`} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '8px 4px', gap: 2,
                }}>
                  <span style={{ fontSize: 16 }}>{slot.emoji}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-3)', textAlign: 'center' }}>
                    {isEn ? slot.en : slot.zh}
                  </span>
                </div>

                {/* Day cells for this slot */}
                {DAYS.map((day) => {
                  const slotKey = `${day.key}-${slot.key}`
                  const entry = plan?.slots[slotKey]
                  return (
                    <div key={slotKey} style={{
                      background: 'var(--color-card)',
                      borderRadius: 'var(--radius-md)',
                      minHeight: 72,
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      boxShadow: 'var(--shadow-card)',
                      border: picking?.dayKey === day.key && picking.slot === slot.key
                        ? '2px solid var(--color-primary)' : '1px solid transparent',
                    }}>
                      {entry ? (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text)', flex: 1 }}>
                            {entry.recipeName}
                          </p>
                          <button
                            onClick={() => handleClearSlot(day.key, slot.key)}
                            style={{
                              alignSelf: 'flex-end', background: 'none', border: 'none',
                              color: 'var(--color-text-3)', cursor: 'pointer', padding: 2,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setPicking({ dayKey: day.key, slot: slot.key }); setRecipeSearch('') }}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'none', border: 'none', color: 'var(--color-text-3)',
                            cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                            transition: 'background 0.1s',
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Shopping list summary */}
      {recipesInPlan.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 72, left: 0, right: 0, padding: '0 16px',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'var(--color-primary)', borderRadius: 'var(--radius-lg)',
            padding: '10px 16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', pointerEvents: 'auto', boxShadow: 'var(--shadow-lg)',
          }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {recipesInPlan.length} {isEn ? 'recipes planned' : '個食譜已計劃'}
            </p>
            <button
              onClick={handleAddToShopping}
              style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ShoppingCart size={14} /> {isEn ? 'Add to Shopping' : '加入購物清單'}
            </button>
          </div>
        </div>
      )}

      {/* Recipe picker modal */}
      {picking && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setPicking(null); setRecipeSearch('') } }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{isEn ? 'Choose Recipe' : '選擇食譜'}</h2>
              <button className="icon-btn" onClick={() => { setPicking(null); setRecipeSearch('') }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="input"
                placeholder={isEn ? 'Search recipes...' : '搜尋食譜...'}
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                autoFocus
              />
              <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 10 }}>
                {filteredRecipes.length === 0 ? (
                  <p style={{ color: 'var(--color-text-3)', textAlign: 'center', padding: 24 }}>
                    {isEn ? 'No recipes found' : '找不到食譜'}
                  </p>
                ) : filteredRecipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handlePickRecipe(r)}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', marginBottom: 4,
                      background: 'var(--color-surface-2)',
                      transition: 'background 0.1s',
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</p>
                    {r.description && <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{r.description.slice(0, 60)}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
