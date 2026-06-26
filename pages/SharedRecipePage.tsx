import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Clock, Users, ChefHat } from 'lucide-react'
import type { Recipe } from '../types'

export default function SharedRecipePage() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'recipes', id)).then((snap) => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return }
      const data = snap.data() as Record<string, unknown>
      if (!data.isPublic) { setNotFound(true); setLoading(false); return }
      setRecipe({ id: snap.id, ...data } as Recipe)
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h2 style={{ fontWeight: 700, fontSize: 20 }}>食譜唔存在或者已設為私人</h2>
      <p style={{ color: '#64748b', fontSize: 14 }}>This recipe does not exist or has been set to private.</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', marginBottom: 10,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          🍽️ Personal Vault — 食譜分享
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>{recipe!.title}</h1>
        {recipe!.description && (
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{recipe!.description}</p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {recipe!.prepTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#475569', background: '#f1f5f9', padding: '5px 10px', borderRadius: 8 }}>
              <Clock size={13} /> 準備 {recipe!.prepTime} 分鐘
            </div>
          )}
          {recipe!.cookTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#475569', background: '#f1f5f9', padding: '5px 10px', borderRadius: 8 }}>
              <ChefHat size={13} /> 烹飪 {recipe!.cookTime} 分鐘
            </div>
          )}
          {recipe!.servings && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#475569', background: '#f1f5f9', padding: '5px 10px', borderRadius: 8 }}>
              <Users size={13} /> {recipe!.servings} 份
            </div>
          )}
        </div>
      </div>

      {/* Ingredients */}
      {recipe!.ingredients.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>🛒 食材</h2>
          <div style={{ background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {recipe!.ingredients.map((ing, idx) => (
              <div key={ing.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 14px',
                borderBottom: idx < recipe!.ingredients.length - 1 ? '1px solid #e2e8f0' : 'none',
              }}>
                <span style={{ fontSize: 15 }}>{ing.name}</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>{ing.amount} {ing.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {recipe!.steps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>👨‍🍳 步驟</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recipe!.steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#2563eb', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>
                  {idx + 1}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: '#1e293b', paddingTop: 4 }}>
                  {step.description}
                  {step.duration && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}>
                      ⏱ {step.duration} 分鐘
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {recipe!.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {recipe!.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: '#eff6ff', color: '#2563eb' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, padding: '14px', background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>
          由 <strong>Personal Vault</strong> 分享 · 只讀版本
        </p>
      </div>
    </div>
  )
}
