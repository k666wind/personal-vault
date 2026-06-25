import { useState } from 'react'
import { X, Globe, Lock, Copy, Check, ExternalLink } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import type { Recipe } from '../types'

interface Props {
  recipe: Recipe
  onClose: () => void
}

export default function RecipeShareModal({ recipe, onClose }: Props) {
  const { t } = useAppStore()
  const { update } = useRecipeStore()
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)

  // BUG-03 FIX: Build share URL from origin + basename only, NOT current pathname.
  // Previously used window.location.pathname which included the current page path
  // (e.g. /repo-name/recipes), producing broken URLs like:
  //   https://user.github.io/repo-name/recipes/shared/recipe/123  ← WRONG
  // Correct URL should be:
  //   https://user.github.io/repo-name/shared/recipe/123
  const basename = (import.meta.env.VITE_BASE_PATH as string | undefined) || '/'
  const base = window.location.origin + basename.replace(/\/$/, '')
  const shareUrl = `${base}/shared/recipe/${recipe.id}`

  const handleTogglePublic = async () => {
    setToggling(true)
    try {
      await update(recipe.id, { isPublic: !recipe.isPublic })
    } finally {
      setToggling(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{t('share', 'shareRecipe')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Recipe title */}
          <div style={{
            background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
            padding: '12px 14px', marginBottom: 4,
          }}>
            <p style={{ fontWeight: 600, fontSize: 15 }}>{recipe.title}</p>
            {recipe.description && (
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 2 }}>{recipe.description}</p>
            )}
          </div>

          {/* Public / Private toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0', borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {recipe.isPublic
                ? <Globe size={20} style={{ color: 'var(--color-success)' }} />
                : <Lock size={20} style={{ color: 'var(--color-text-3)' }} />}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  {recipe.isPublic ? t('share', 'isPublic') : t('share', 'isPrivate')}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                  {recipe.isPublic ? t('share', 'viewOnly') : t('share', 'makePublic')}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={toggling}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${recipe.isPublic ? 'var(--color-error)' : 'var(--color-success)'}`,
                color: recipe.isPublic ? 'var(--color-error)' : 'var(--color-success)',
                background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {toggling ? '...' : recipe.isPublic ? t('share', 'makePrivate') : t('share', 'makePublic')}
            </button>
          </div>

          {/* Share link — only show if public */}
          {recipe.isPublic && (
            <div style={{ paddingTop: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>
                {t('share', 'publicLink')}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
                  padding: '10px 12px', fontSize: 12, color: 'var(--color-text-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {shareUrl}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: copied ? 'var(--color-success)' : 'var(--color-primary)',
                    color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? t('share', 'linkCopied') : t('share', 'copyLink')}
                </button>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: 'var(--color-primary)', marginTop: 10, textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} /> 預覽公開頁面
              </a>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>{t('common', 'close')}</button>
        </div>
      </div>
    </div>
  )
}
