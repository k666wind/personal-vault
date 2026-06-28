import { Star, Clock, Users, Trash2, Share2, Pin, PinOff } from 'lucide-react'
import { useState } from 'react'
import { useRecipeStore } from '../stores/recipeStore'
import { useAppStore } from '../stores/appStore'
import ConfirmDialog from './ConfirmDialog'
import type { Recipe } from '../types'

interface Props {
  recipe: Recipe
  onClick: () => void
  onEdit: () => void
  onShare?: () => void
}

const difficultyColor: Record<string, string> = {
  easy: 'var(--color-recipe)',
  medium: 'var(--color-warning)',
  hard: 'var(--color-danger)',
}

export default function RecipeCard({ recipe, onClick, onEdit, onShare }: Props) {
  const { toggleFavourite, remove, update } = useRecipeStore()
  const { t } = useAppStore()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
    <div className="card recipe-card" onClick={onClick}
      style={{ borderLeft: recipe.isPinned ? '3px solid var(--color-recipe)' : undefined }}>
      <div className="recipe-card-top">
        <h3 className="recipe-title">
          {recipe.isPinned && <Pin size={11} style={{ color: 'var(--color-recipe)', marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
          {recipe.title}
        </h3>
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="icon-btn"
            onClick={() => update(recipe.id, { isPinned: !recipe.isPinned })}
            title={recipe.isPinned ? t('common', 'unpin') : t('common', 'pin')}
          >
            {recipe.isPinned
              ? <PinOff size={14} style={{ color: 'var(--color-recipe)' }} />
              : <Pin size={14} />}
          </button>
          <button
            className={`icon-btn star-btn ${recipe.isFavourite ? 'starred' : ''}`}
            onClick={() => toggleFavourite(recipe.id, recipe.isFavourite)}
          >
            <Star size={17} fill={recipe.isFavourite ? 'currentColor' : 'none'} />
          </button>
          {onShare && (
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onShare() }}>
              <Share2 size={15} style={{ color: recipe.isPublic ? 'var(--color-success)' : undefined }} />
            </button>
          )}
          <button className="icon-btn" onClick={onEdit}>
            ✏️
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {recipe.description && (
        <p className="recipe-desc">{recipe.description}</p>
      )}

      <div className="recipe-card-meta">
        {(recipe.prepTime || recipe.cookTime) && (
          <span className="recipe-chip">
            <Clock size={12} />
            {(recipe.prepTime || 0) + (recipe.cookTime || 0)} {t('recipe', 'minutes')}
          </span>
        )}
        {recipe.servings && (
          <span className="recipe-chip">
            <Users size={12} />
            {recipe.servings} 份
          </span>
        )}
        {recipe.difficulty && (
          <span className="recipe-chip" style={{ color: difficultyColor[recipe.difficulty] }}>
            {t('recipe', recipe.difficulty)}
          </span>
        )}
        {recipe.ingredients.length > 0 && (
          <span className="recipe-chip">{recipe.ingredients.length} 種食材</span>
        )}
      </div>

      {recipe.tags.length > 0 && (
        <div className="tags-row">
          {recipe.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}
    </div>
    {showConfirm && (
      <ConfirmDialog
        message={t('common', 'confirmDelete')}
        onConfirm={() => { setShowConfirm(false); remove(recipe.id) }}
        onCancel={() => setShowConfirm(false)}
      />
    )}
    </>
  )
}
