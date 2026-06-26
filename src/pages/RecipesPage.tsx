import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Star, Tag, X, RefreshCw, CheckSquare, ShoppingCart } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import RecipeDetailModal from '../components/RecipeDetailModal'
import RecipeShareModal from '../components/RecipeShareModal'
import BulkActionBar from '../components/BulkActionBar'
import type { Recipe } from '../types'

export default function RecipesPage() {
  const { t, user } = useAppStore()
  const { recipes, loading, error, init, teardown, update, remove } = useRecipeStore()
  const navigate = useNavigate()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Recipe | undefined>()
  const [viewTarget, setViewTarget] = useState<Recipe | undefined>()
  const [shareTarget, setShareTarget] = useState<Recipe | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach((r) => (r.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [recipes])

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
        return r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) ||
          r.tags.some((tg) => tg.includes(q))
      }
      return true
    })
  }, [recipes, search, filterTag, showFavOnly, ingredientSearch])

  const shoppingCount = useMemo(() =>
    recipes.reduce((acc, r) => acc + r.ingredients.filter((i) => i.inShoppingList).length, 0),
    [recipes]
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('bulk', 'confirmDelete'))) return
    await Promise.all([...selected].map((id) => remove(id)))
    setSelected(new Set()); setBulkMode(false)
  }

  const handleBulkAddTag = async (tag: string) => {
    await Promise.all([...selected].map((id) => {
      const item = recipes.find((r) => r.id === id)
      if (!item || item.tags.includes(tag)) return Promise.resolve()
      return update(id, { tags: [...item.tags, tag] })
    }))
  }

  const handleView = (r: Recipe) => { if (bulkMode) { toggleSelect(r.id); return }; setViewTarget(r) }
  const handleEdit = (r: Recipe) => { setEditTarget(r); setViewTarget(undefined); setShowAddModal(true) }
  const handleAdd = () => { setEditTarget(undefined); setShowAddModal(true) }

  const renderContent = () => {
    if (loading) return <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    if (error === 'index-building') return (
      <div className="empty-page">
        <RefreshCw size={36} className="empty-icon building-icon" />
        <p className="error-state-title">{t('error', 'indexBuilding')}</p>
        <p className="error-state-hint">{t('error', 'indexHint')}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retryAgain')}</button>
      </div>
    )
    if (error) return (
      <div className="empty-page">
        <p className="error-state-title">{t('error', 'loadFailed')}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retry')}</button>
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
          <div key={r.id} className={`selectable-wrap ${bulkMode && selected.has(r.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(r.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(r.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <RecipeCard
                recipe={r}
                onClick={() => handleView(r)}
                onEdit={() => handleEdit(r)}
                onShare={() => setShareTarget(r)}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('recipe', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => navigate('/shopping')}>
            <ShoppingCart size={19} />
            {shoppingCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: 'var(--color-primary)', color: '#fff',
                fontSize: 9, fontWeight: 700, borderRadius: '50%',
                width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{shoppingCount}</span>
            )}
          </button>
          <button className="icon-btn" onClick={() => navigate('/tags')}><Tag size={18} /></button>
          <button className="icon-btn" onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <span className="item-count">{recipes.length}</span>
        </div>
      </header>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size} totalCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((r) => r.id)))}
          onDeselectAll={() => setSelected(new Set())}
          onDelete={handleBulkDelete} onAddTag={handleBulkAddTag}
          onCancel={() => { setBulkMode(false); setSelected(new Set()) }}
          allTags={allTags}
        />
      )}

      <div className="search-bar" style={{ margin: '12px 16px 4px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" className="search-input" placeholder={t('common', 'search')}
          value={search} onChange={(e) => { setSearch(e.target.value); setIngredientSearch('') }} />
        {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

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

      {!bulkMode && (
        <button className="fab" onClick={handleAdd}><Plus size={24} /></button>
      )}

      {showAddModal && (
        <RecipeModal recipe={editTarget}
          onClose={() => { setShowAddModal(false); setEditTarget(undefined) }}
          allTags={allTags} />
      )}
      {viewTarget && (
        <RecipeDetailModal recipe={viewTarget}
          onEdit={() => handleEdit(viewTarget)}
          onShare={() => { setViewTarget(undefined); setShareTarget(viewTarget) }}
          onClose={() => setViewTarget(undefined)} />
      )}
      {shareTarget && (
        <RecipeShareModal recipe={shareTarget} onClose={() => setShareTarget(undefined)} />
      )}
    </div>
  )
}
