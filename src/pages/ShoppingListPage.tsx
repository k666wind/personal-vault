import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Trash2, ShoppingCart } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import type { Ingredient } from '../types'

interface ShoppingItem extends Ingredient {
  recipeId: string
  recipeTitle: string
  checked: boolean
}

export default function ShoppingListPage() {
  const { t, user } = useAppStore()
  // BUG-05 FIX: initialise the recipe store if it hasn't been loaded yet.
  // Without this, navigating directly to /shopping (e.g. via PWA shortcut)
  // shows an empty list because recipes haven't been fetched from Firestore.
  const { recipes, update, init, teardown } = useRecipeStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  // Collect all ingredients marked inShoppingList from all recipes
  const allItems = useMemo<ShoppingItem[]>(() => {
    const result: ShoppingItem[] = []
    for (const r of recipes) {
      for (const ing of r.ingredients) {
        if (ing.inShoppingList) {
          result.push({ ...ing, recipeId: r.id, recipeTitle: r.title, checked: false })
        }
      }
    }
    return result
  }, [recipes])

  // Local checked state (by ingredient id)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Group by recipe
  const grouped = useMemo(() => {
    const map = new Map<string, { recipeTitle: string; items: ShoppingItem[] }>()
    for (const item of allItems) {
      if (!map.has(item.recipeId)) {
        map.set(item.recipeId, { recipeTitle: item.recipeTitle, items: [] })
      }
      map.get(item.recipeId)!.items.push(item)
    }
    return map
  }, [allItems])

  const handleClearDone = async () => {
    // Remove checked items from their respective recipes
    const byRecipe = new Map<string, Set<string>>()
    for (const item of allItems) {
      if (checked.has(item.id)) {
        if (!byRecipe.has(item.recipeId)) byRecipe.set(item.recipeId, new Set())
        byRecipe.get(item.recipeId)!.add(item.id)
      }
    }
    for (const [recipeId, removedIds] of byRecipe) {
      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) continue
      const updated = recipe.ingredients.map((ing) =>
        removedIds.has(ing.id) ? { ...ing, inShoppingList: false } : ing
      )
      await update(recipeId, { ingredients: updated })
    }
    setChecked(new Set())
  }

  const doneCount = allItems.filter((i) => checked.has(i.id)).length

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/recipes')}>
          <ChevronLeft size={22} />
        </button>
        <h1>{t('shopping', 'title')}</h1>
        <span className="item-count">{allItems.length}</span>
      </header>

      {allItems.length === 0 ? (
        <div className="empty-page">
          <ShoppingCart size={48} style={{ color: 'var(--color-text-3)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-2)', textAlign: 'center', padding: '0 32px' }}>
            {t('shopping', 'empty')}
          </p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/recipes')}>
            {t('recipe', 'title')}
          </button>
        </div>
      ) : (
        <>
          {doneCount > 0 && (
            <div style={{ padding: '8px 16px 0' }}>
              <button
                className="btn-outline-sm"
                onClick={handleClearDone}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={13} />
                {t('shopping', 'clearDone')} ({doneCount})
              </button>
            </div>
          )}

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...grouped.entries()].map(([recipeId, group]) => (
              <div key={recipeId}>
                <p style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', color: 'var(--color-text-3)',
                  marginBottom: 6,
                }}>
                  {t('shopping', 'fromRecipe')} {group.recipeTitle}
                </p>
                <div style={{
                  background: 'var(--color-card)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  {group.items.map((item, idx) => {
                    const isDone = checked.has(item.id)
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 14px',
                          borderBottom: idx < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                          background: isDone ? 'var(--color-surface-2)' : 'transparent',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: `2px solid ${isDone ? 'var(--color-success)' : 'var(--color-border)'}`,
                          background: isDone ? 'var(--color-success)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}>
                          {isDone && <Check size={12} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{
                          flex: 1, fontSize: 15,
                          color: isDone ? 'var(--color-text-3)' : 'var(--color-text)',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-3)', flexShrink: 0 }}>
                          {item.amount} {item.unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {doneCount === allItems.length && allItems.length > 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-success)', fontWeight: 700 }}>
              🎉 {t('shopping', 'allDone')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
