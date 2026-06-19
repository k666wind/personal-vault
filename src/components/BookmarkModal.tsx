import { useState } from 'react'
import { X, Loader2, Link } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import TagInput from './TagInput'
import { fetchUrlMeta, isValidUrl, normaliseUrl } from '../lib/urlMeta'
import type { Bookmark } from '../types'

interface Props {
  bookmark?: Bookmark
  onClose: () => void
  allTags: string[]
}

export default function BookmarkModal({ bookmark, onClose, allTags }: Props) {
  const { t, user } = useAppStore()
  const { add, update } = useBookmarkStore()

  const [url, setUrl] = useState(bookmark?.url || '')
  const [title, setTitle] = useState(bookmark?.title || '')
  const [description, setDescription] = useState(bookmark?.description || '')
  const [favicon, setFavicon] = useState(bookmark?.favicon || '')
  const [tags, setTags] = useState<string[]>(bookmark?.tags || [])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!bookmark

  // Auto-fetch metadata when URL is pasted
  const handleUrlBlur = async () => {
    if (!url || isEdit || title) return
    const normed = normaliseUrl(url)
    if (!isValidUrl(normed)) return

    setFetching(true)
    const meta = await fetchUrlMeta(normed)
    if (meta.title) setTitle(meta.title)
    if (meta.description) setDescription(meta.description)
    if (meta.favicon) setFavicon(meta.favicon)
    setUrl(normed)
    setFetching(false)
  }

  const handleSave = async () => {
    const normedUrl = normaliseUrl(url)
    if (!normedUrl || !isValidUrl(normedUrl)) {
      setError('請輸入有效網址')
      return
    }
    if (!title.trim()) {
      setError('請輸入標題')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await update(bookmark.id, { url: normedUrl, title: title.trim(), description, favicon, tags })
      } else {
        await add(user!.uid, {
          url: normedUrl,
          title: title.trim(),
          description,
          favicon,
          tags,
          isFavourite: false,
        })
      }
      onClose()
    } catch (e) {
      setError('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? t('common', 'edit') : t('bookmark', 'add')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* URL */}
          <div className="field">
            <label className="field-label">{t('bookmark', 'url')}</label>
            <div className="input-with-icon">
              <Link size={15} className="input-icon" />
              <input
                type="url"
                className="input input-icon-pad"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                autoFocus={!isEdit}
              />
            </div>
            {fetching && (
              <p className="field-hint fetching">
                <Loader2 size={13} className="spin" />
                {t('bookmark', 'fetchingMeta')}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="field">
            <label className="field-label">{t('common', 'edit')} — 標題</label>
            <input
              type="text"
              className="input"
              placeholder="標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="field">
            <label className="field-label">描述（可選）</label>
            <textarea
              className="input"
              rows={2}
              placeholder="描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

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
