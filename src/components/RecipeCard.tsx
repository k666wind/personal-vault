import { Star, Clock, Users, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useRecipeStore } from '../stores/recipeStore'
import { useAppStore } from '../stores/appStore'
import type { Recipe } from '../types'

interface Props {
  recipe: Recipe
  onClick: () => void
  onEdit: () => void
}

const difficultyColor: Record<string, string> = {
  easy: 'var(--color-recipe)',
  medium: 'var(--color-warning)',
  hard: 'var(--color-danger)',
}

export default function RecipeCard({ recipe, onClick, onEdit }: Props) {
  const { toggleFavourite, remove } = useRecipeStore()
  const { t } = useAppStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  void onEdit

  return (
    <div className="card recipe-card" onClick={onClick}>
      <div className="recipe-card-top">
        <h3 className="recipe-title">{recipe.title}</h3>
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`icon-btn star-btn ${recipe.isFavourite ? 'starred' : ''}`}
            onClick={() => toggleFavourite(recipe.id, recipe.isFavourite)}
          >
            <Star size={17} fill={recipe.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`icon-btn ${confirmDelete ? 'danger-btn' : ''}`}
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return } remove(recipe.id) }}
            onBlur={() => setConfirmDelete(false)}
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
  )
}
