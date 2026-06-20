import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import RecipeDetailModal from '../components/RecipeDetailModal'
import type { Recipe } from '../types'

export default function RecipesPage() {
  const { t, user } = useAppStore()
  const { recipes, loading, error, init, teardown } = useRecipeStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipe | undefined>()
  const [viewTarget, setViewTarget] = useState<Recipe | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [ingredientSearch, setIngredientSearch] = useState('')

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [recipes.map(r => r.tags?.join(',')).join('|')])

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (showFavOnly && !r.isFavourite) return false
      if (filterTag && !r.tags.includes(filterTag)) return false
      if (ingredientSearch) {
        const q = ingredientSearch.toLowerCase()
        return r.ingredients.some((i) => i.name.toLowerCase().includes(q))
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          r.title.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q))
        )
      }
      return true
    })
  }, [recipes, search, filterTag, showFavOnly, ingredientSearch])

  const handleView = (r: Recipe) => { setViewTarget(r); setShowAddModal(false) }
  const handleEdit = (r: Recipe) => { setEditTarget(r); setViewTarget(undefined); setShowAddModal(true) }
  const handleAdd = () => { setEditTarget(undefined); setShowAddModal(true) }

  const renderContent = () => {
    if (loading) return (
      <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    )
    if (error === 'index-building') return (
      <div className="empty-page">
        <RefreshCw size={36} className="empty-icon building-icon" />
        <p className="error-state-title">Firebase Index 建立中</p>
        <p className="error-state-hint">通常需要 1–3 分鐘</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>重新嘗試</button>
      </div>
    )
    if (error) return (
      <div className="empty-page">
        <p className="error-state-title">載入失敗</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>重試</button>
      </div>
    )
    if (filtered.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">🍳</div>
        <p>{recipes.length === 0 ? '未有食譜，點右下角新增' : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {filtered.map((r) => (
          <RecipeCard key={r.id} recipe={r} onClick={() => handleView(r)} onEdit={() => handleEdit(r)} />
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('recipe', 'title')}</h1>
        <span className="item-count">{recipes.length}</span>
      </header>

      {/* Main search */}
      <div className="search-bar" style={{ margin: '12px 16px 4px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" className="search-input" placeholder={t('common', 'search')}
          value={search} onChange={(e) => { setSearch(e.target.value); setIngredientSearch('') }} />
        {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      {/* Ingredient search */}
      <div className="search-bar ingredient-search" style={{ margin: '6px 16px 8px' }}>
        <span className="ingredient-search-label">🥕</span>
        <input type="text" className="search-input" placeholder={t('recipe', 'findByIngredient')}
          value={ingredientSearch} onChange={(e) => { setIngredientSearch(e.target.value); setSearch('') }} />
        {ingredientSearch && <button className="icon-btn" onClick={() => setIngredientSearch('')}><X size={14} /></button>}
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${showFavOnly ? 'active' : ''}`} onClick={() => setShowFavOnly(!showFavOnly)}>
          <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />{t('common', 'favourites')}
        </button>
        {allTags.map((tag) => (
          <button key={tag} className={`filter-chip ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}>
            <Tag size={11} />{tag}
          </button>
        ))}
      </div>

      {renderContent()}

      <button className="fab" onClick={handleAdd}><Plus size={24} /></button>

      {showAddModal && (
        <RecipeModal
          recipe={editTarget}
          onClose={() => { setShowAddModal(false); setEditTarget(undefined) }}
          allTags={allTags}
        />
      )}

      {viewTarget && (
        <RecipeDetailModal
          recipe={viewTarget}
          onEdit={() => handleEdit(viewTarget)}
          onClose={() => setViewTarget(undefined)}
        />
      )}
    </div>
  )
}
