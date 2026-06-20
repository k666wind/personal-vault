import { useState, useRef } from 'react'
import { X, Plus, Trash2, Loader2, Camera } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useRecipeStore } from '../stores/recipeStore'
import TagInput from './TagInput'
import { ocrExtractRecipe } from '../lib/ocr'
import type { Recipe, Ingredient, RecipeStep } from '../types'

interface Props {
  recipe?: Recipe
  onClose: () => void
  allTags: string[]
}

const uid = () => Math.random().toString(36).slice(2, 8)

const EMPTY_INGREDIENT = (): Ingredient => ({ id: uid(), name: '', amount: '', unit: '' })
const EMPTY_STEP = (): RecipeStep => ({ id: uid(), order: 0, description: '', duration: undefined })

export default function RecipeModal({ recipe, onClose, allTags }: Props) {
  const { t, user, settings } = useAppStore()
  const { add, update } = useRecipeStore()
  const isEdit = !!recipe

  const [title, setTitle] = useState(recipe?.title || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length ? recipe.ingredients : [EMPTY_INGREDIENT()]
  )
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe?.steps?.length ? recipe.steps : [EMPTY_STEP()]
  )
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() || '')
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || '')
  const [servings, setServings] = useState(recipe?.servings?.toString() || '')
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>(recipe?.difficulty)
  const [tags, setTags] = useState<string[]>(recipe?.tags || [])
  const [nutrition, setNutrition] = useState(recipe?.nutrition || {})
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'basic' | 'steps' | 'nutrition'>('basic')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Ingredient helpers ──────────────────────────────────
  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }
  const addIngredient = () => setIngredients((prev) => [...prev, EMPTY_INGREDIENT()])
  const removeIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id))

  // ── Step helpers ────────────────────────────────────────
  const updateStep = (id: string, field: keyof RecipeStep, value: string | number) => {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }
  const addStep = () => setSteps((prev) => [...prev, { ...EMPTY_STEP(), order: prev.length }])
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id))

  // ── OCR extract recipe ──────────────────────────────────
  const handleOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!settings.claudeApiKey) { setError('請先在設定填入 Claude API Key'); return }
    setOcrLoading(true)
    setError('')
    try {
      const result = await ocrExtractRecipe(file, settings.claudeApiKey)
      if (result.title) setTitle(result.title)
      if (result.description) setDescription(result.description)
      if (result.ingredients?.length) {
        setIngredients(result.ingredients.map((i) => ({ ...i, id: uid(), inShoppingList: false })))
      }
      if (result.steps?.length) {
        setSteps(result.steps.map((s, idx) => ({ ...s, id: uid(), order: idx })))
      }
      if (result.cookTime) setCookTime(String(result.cookTime))
      if (result.prepTime) setPrepTime(String(result.prepTime))
      if (result.servings) setServings(String(result.servings))
      if (result.difficulty) setDifficulty(result.difficulty)
      if (result.nutrition) setNutrition(result.nutrition)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR 失敗')
    } finally {
      setOcrLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { setError('請輸入食譜名稱'); return }
    setSaving(true)
    try {
      const data: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description,
        ingredients: ingredients.filter((i) => i.name.trim()),
        steps: steps.filter((s) => s.description.trim()).map((s, idx) => ({ ...s, order: idx })),
        cookTime: cookTime ? Number(cookTime) : undefined,
        prepTime: prepTime ? Number(prepTime) : undefined,
        servings: servings ? Number(servings) : undefined,
        difficulty,
        nutrition,
        tags,
        isFavourite: recipe?.isFavourite || false,
      }
      if (isEdit) await update(recipe.id, data)
      else await add(user!.uid, data)
      onClose()
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  const difficultyOptions: Array<{ value: Recipe['difficulty']; label: string }> = [
    { value: 'easy', label: t('recipe', 'easy') },
    { value: 'medium', label: t('recipe', 'medium') },
    { value: 'hard', label: t('recipe', 'hard') },
  ]

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h2>{isEdit ? t('common', 'edit') : t('recipe', 'add')}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* OCR button */}
            <button className="btn-ocr" onClick={() => fileRef.current?.click()} disabled={ocrLoading}>
              {ocrLoading ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
              {ocrLoading ? '提取中...' : t('recipe', 'extractFromImage')}
            </button>
            <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOcrFile} />
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {(['basic', 'steps', 'nutrition'] as const).map((tab) => (
            <button
              key={tab}
              className={`modal-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {{ basic: '基本', steps: '步驟', nutrition: '營養' }[tab]}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── Basic Tab ── */}
          {activeTab === 'basic' && (
            <>
              <div className="field">
                <label className="field-label">食譜名稱</label>
                <input className="input" placeholder="食譜名稱" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!isEdit} />
              </div>
              <div className="field">
                <label className="field-label">描述（可選）</label>
                <textarea className="input" rows={2} placeholder="簡短描述..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Time + Servings */}
              <div className="field-row">
                <div className="field">
                  <label className="field-label">{t('recipe', 'prepTime')}（分）</label>
                  <input className="input" type="number" placeholder="15" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t('recipe', 'cookTime')}（分）</label>
                  <input className="input" type="number" placeholder="30" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t('recipe', 'servings')}</label>
                  <input className="input" type="number" placeholder="4" value={servings} onChange={(e) => setServings(e.target.value)} />
                </div>
              </div>

              {/* Difficulty */}
              <div className="field">
                <label className="field-label">{t('recipe', 'difficulty')}</label>
                <div className="difficulty-options">
                  <button className={`diff-btn ${difficulty === undefined ? 'active' : ''}`} onClick={() => setDifficulty(undefined)}>
                    全部
                  </button>
                  {difficultyOptions.map(({ value, label }) => (
                    <button key={value} className={`diff-btn diff-${value} ${difficulty === value ? 'active' : ''}`} onClick={() => setDifficulty(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div className="field">
                <div className="field-label-row">
                  <label className="field-label">{t('recipe', 'ingredients')}</label>
                  <button className="btn-add-row" onClick={addIngredient}><Plus size={13} /> 新增</button>
                </div>
                <div className="ingredient-list">
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="ingredient-row">
                      <input className="input ing-name" placeholder="食材" value={ing.name} onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)} />
                      <input className="input ing-amount" placeholder="份量" value={ing.amount} onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)} />
                      <input className="input ing-unit" placeholder="單位" value={ing.unit} onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)} />
                      <button className="icon-btn" onClick={() => removeIngredient(ing.id)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="field">
                <label className="field-label">{t('common', 'tags')}</label>
                <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
              </div>
            </>
          )}

          {/* ── Steps Tab ── */}
          {activeTab === 'steps' && (
            <div className="field">
              <div className="field-label-row">
                <label className="field-label">{t('recipe', 'steps')}</label>
                <button className="btn-add-row" onClick={addStep}><Plus size={13} /> 新增</button>
              </div>
              <div className="steps-list">
                {steps.map((step, idx) => (
                  <div key={step.id} className="step-row">
                    <div className="step-num">{idx + 1}</div>
                    <div className="step-fields">
                      <textarea
                        className="input step-textarea"
                        placeholder={`步驟 ${idx + 1}...`}
                        rows={3}
                        value={step.description}
                        onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                      />
                      <div className="step-time-row">
                        <input
                          className="input step-time"
                          type="number"
                          placeholder="時間（分）"
                          value={step.duration || ''}
                          onChange={(e) => updateStep(step.id, 'duration', Number(e.target.value))}
                        />
                        <button className="icon-btn" onClick={() => removeStep(step.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Nutrition Tab ── */}
          {activeTab === 'nutrition' && (
            <div className="field">
              <label className="field-label">{t('recipe', 'nutrition')}（每份）</label>
              <div className="nutrition-grid">
                {([
                  { key: 'calories', label: t('recipe', 'calories'), unit: 'kcal' },
                  { key: 'protein', label: t('recipe', 'protein'), unit: 'g' },
                  { key: 'carbs', label: t('recipe', 'carbs'), unit: 'g' },
                  { key: 'fat', label: t('recipe', 'fat'), unit: 'g' },
                  { key: 'fiber', label: t('recipe', 'fiber'), unit: 'g' },
                ] as const).map(({ key, label, unit }) => (
                  <div key={key} className="nutrition-field">
                    <label className="field-label">{label}</label>
                    <div className="nutrition-input-wrap">
                      <input
                        className="input"
                        type="number"
                        placeholder="0"
                        value={(nutrition as Record<string, number>)[key] || ''}
                        onChange={(e) => setNutrition((prev) => ({ ...prev, [key]: Number(e.target.value) || undefined }))}
                      />
                      <span className="nutrition-unit">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{t('common', 'cancel')}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : t('common', 'save')}
          </button>
        </div>
      </div>
    </div>
  )
}
