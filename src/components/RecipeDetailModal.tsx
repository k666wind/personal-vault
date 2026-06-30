import { useState, useEffect } from 'react'
import { X, Clock, Users, ChefHat, Star, Edit2, ShoppingCart, Check, Share2 } from 'lucide-react'
import CookMode from './CookMode'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import type { Recipe } from '../types'

interface Props {
  recipe: Recipe
  onEdit: () => void
  onShare?: () => void
  onClose: () => void
}

export default function RecipeDetailModal({ recipe, onEdit, onShare, onClose }: Props) {
  const { t } = useAppStore()
  const { update, toggleFavourite } = useRecipeStore()
  const [servingMult, setServingMult] = useState(1)
  const [cookMode, setCookMode] = useState(false)
  const [shoppingList, setShoppingList] = useState<Set<string>>(
    new Set(recipe.ingredients.filter((i) => i.inShoppingList).map((i) => i.id))
  )

  // BUG-26 FIX: re-sync local shoppingList state when the recipe prop is
  // updated by Firestore (e.g. another tab added/removed ingredients).
  // Without this, saving the shopping list would overwrite remote changes
  // with a stale local set of ingredient IDs.
  useEffect(() => {
    setShoppingList(new Set(recipe.ingredients.filter((i) => i.inShoppingList).map((i) => i.id)))
  }, [recipe.id, recipe.ingredients.map((i) => i.id + String(i.inShoppingList)).join(',')])

  const baseServings = recipe.servings || 1
  const multiplier = servingMult

  const scaleAmount = (amount: string): string => {
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    const scaled = num * multiplier
    return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1)
  }

  const toggleShopping = (id: string) => {
    setShoppingList((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const saveShoppingList = async () => {
    const updated = recipe.ingredients.map((i) => ({
      ...i,
      inShoppingList: shoppingList.has(i.id),
    }))
    await update(recipe.id, { ingredients: updated })
  }

  const difficultyLabel: Record<string, string> = {
    easy: t('recipe', 'easy'),
    medium: t('recipe', 'medium'),
    hard: t('recipe', 'hard'),
  }

  const difficultyColor: Record<string, string> = {
    easy: 'var(--color-recipe)',
    medium: 'var(--color-warning)',
    hard: 'var(--color-danger)',
  }

  if (cookMode) {
    return <CookMode recipe={recipe} onClose={() => setCookMode(false)} />
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h2 style={{ flex: 1, fontSize: 16 }}>{recipe.title}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`icon-btn star-btn ${recipe.isFavourite ? 'starred' : ''}`}
              onClick={() => toggleFavourite(recipe.id, recipe.isFavourite)}
            >
              <Star size={18} fill={recipe.isFavourite ? 'currentColor' : 'none'} />
            </button>
            {onShare && (
              <button className="icon-btn" onClick={onShare} title="分享">
                <Share2 size={18} style={{ color: recipe.isPublic ? "var(--color-success)" : undefined }} />
              </button>
            )}
            <button className="icon-btn" onClick={() => setCookMode(true)} title={recipe.steps.length === 0 ? '先新增步驟' : '煮食模式'}
              disabled={recipe.steps.length === 0}>
              <ChefHat size={18} style={{ color: recipe.steps.length > 0 ? 'var(--color-recipe)' : undefined }} />
            </button>
            <button className="icon-btn" onClick={onEdit}><Edit2 size={18} /></button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* Meta chips */}
          <div className="recipe-meta-row">
            {recipe.prepTime && (
              <div className="recipe-meta-chip">
                <Clock size={13} />
                <span>準備 {recipe.prepTime}{t('recipe', 'minutes')}</span>
              </div>
            )}
            {recipe.cookTime && (
              <div className="recipe-meta-chip">
                <ChefHat size={13} />
                <span>烹飪 {recipe.cookTime}{t('recipe', 'minutes')}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="recipe-meta-chip">
                <Users size={13} />
                <span>{recipe.servings} 份</span>
              </div>
            )}
            {recipe.difficulty && (
              <div className="recipe-meta-chip" style={{ color: difficultyColor[recipe.difficulty], background: `${difficultyColor[recipe.difficulty]}15` }}>
                <span>{difficultyLabel[recipe.difficulty]}</span>
              </div>
            )}
          </div>

          {recipe.description && <p className="recipe-description">{recipe.description}</p>}

          {/* Serving scaler */}
          {recipe.servings && (
            <div className="serving-scaler">
              <span className="field-label">份量調整</span>
              <div className="scaler-controls">
                <button className="scaler-btn" onClick={() => setServingMult((m) => Math.max(0.5, m - 0.5))}>−</button>
                <span className="scaler-value">{baseServings * multiplier} 份</span>
                <button className="scaler-btn" onClick={() => setServingMult((m) => m + 0.5)}>＋</button>
              </div>
            </div>
          )}

          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <div className="field">
              <div className="field-label-row">
                <label className="field-label">{t('recipe', 'ingredients')}</label>
                <button className="btn-add-row" onClick={saveShoppingList}>
                  <ShoppingCart size={12} /> 儲存清單
                </button>
              </div>
              <div className="ingredient-detail-list">
                {recipe.ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className={`ingredient-detail-row ${shoppingList.has(ing.id) ? 'in-list' : ''}`}
                    onClick={() => toggleShopping(ing.id)}
                  >
                    <div className="ing-check">
                      {shoppingList.has(ing.id) && <Check size={12} />}
                    </div>
                    <span className="ing-detail-name">{ing.name}</span>
                    <span className="ing-detail-amount">
                      {scaleAmount(ing.amount)} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {recipe.steps.length > 0 && (
            <div className="field">
              <label className="field-label">{t('recipe', 'steps')}</label>
              <div className="steps-detail-list">
                {recipe.steps.map((step, idx) => (
                  <div key={step.id} className="step-detail-row">
                    <div className="step-detail-num">{idx + 1}</div>
                    <div className="step-detail-content">
                      <p className="step-detail-desc">{step.description}</p>
                      {step.duration && (
                        <span className="step-duration">
                          <Clock size={11} /> {step.duration} {t('recipe', 'minutes')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition */}
          {recipe.nutrition && Object.keys(recipe.nutrition).length > 0 && (
            <div className="field">
              <label className="field-label">{t('recipe', 'nutrition')}（每份）</label>
              <div className="nutrition-display">
                {recipe.nutrition.calories && (
                  <div className="nutrition-item">
                    <span className="nutrition-val">{recipe.nutrition.calories}</span>
                    <span className="nutrition-lbl">kcal</span>
                  </div>
                )}
                {recipe.nutrition.protein && (
                  <div className="nutrition-item">
                    <span className="nutrition-val">{recipe.nutrition.protein}g</span>
                    <span className="nutrition-lbl">{t('recipe', 'protein')}</span>
                  </div>
                )}
                {recipe.nutrition.carbs && (
                  <div className="nutrition-item">
                    <span className="nutrition-val">{recipe.nutrition.carbs}g</span>
                    <span className="nutrition-lbl">{t('recipe', 'carbs')}</span>
                  </div>
                )}
                {recipe.nutrition.fat && (
                  <div className="nutrition-item">
                    <span className="nutrition-val">{recipe.nutrition.fat}g</span>
                    <span className="nutrition-lbl">{t('recipe', 'fat')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="tags-row">
              {recipe.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
