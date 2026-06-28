import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Merge, Check, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'
import { usePasswordStore } from '../stores/passwordStore'
import { useCountdownStore } from '../stores/countdownStore'
import ConfirmDialog from '../components/ConfirmDialog'

interface TagInfo {
  tag: string
  count: number
  modules: string[]
}

export default function TagManagerPage() {
  const { t, user } = useAppStore()
  const navigate = useNavigate()
  const { bookmarks, update: updateBm, init: initBm, teardown: tearBm } = useBookmarkStore()
  const { notes, update: updateNt, init: initNt, teardown: tearNt } = useNoteStore()
  const { recipes, update: updateRc, init: initRc, teardown: tearRc } = useRecipeStore()
  const { entries: passwords, updateFields: updatePw, init: initPw, teardown: tearPw } = usePasswordStore()
  const { items: countdowns, update: updateCd, subscribe: subCd, cleanup: cleanCd } = useCountdownStore()

  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [mergingTag, setMergingTag] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingDeleteTag, setPendingDeleteTag] = useState<string | null>(null)

  // BUG-06 FIX: initialise all stores so tags are available when navigating
  // directly to /tags (e.g. from BottomNav or browser history) without having
  // visited any module page first.
  useEffect(() => {
    if (!user) return
    initBm(user.uid)
    initNt(user.uid)
    initRc(user.uid)
    initPw(user.uid)
    subCd(user.uid)
    return () => {
      tearBm()
      tearNt()
      tearRc()
      tearPw()
      cleanCd()
    }
  }, [user?.uid])

  // Collect all tags with counts across all modules
  const tagInfos = useMemo<TagInfo[]>(() => {
    const map = new Map<string, TagInfo>()

    const add = (tag: string, module: string) => {
      if (!map.has(tag)) map.set(tag, { tag, count: 0, modules: [] })
      const info = map.get(tag)!
      info.count++
      if (!info.modules.includes(module)) info.modules.push(module)
    }

    bookmarks.forEach((b) => b.tags.forEach((tg) => add(tg, t('nav', 'bookmarks'))))
    notes.forEach((n) => n.tags.forEach((tg) => add(tg, t('nav', 'notes'))))
    recipes.forEach((r) => r.tags.forEach((tg) => add(tg, t('nav', 'recipes'))))
    passwords.forEach((p) => p.tags.forEach((tg) => add(tg, t('nav', 'passwords'))))
    countdowns.forEach((c) => c.tags.forEach((tg) => add(tg, t('nav', 'countdown'))))

    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [bookmarks, notes, recipes, passwords, countdowns])

  const allTagNames = tagInfos.map((i) => i.tag)

  // Rename a tag across all items
  const handleRename = async (oldTag: string, newTag: string) => {
    if (!newTag.trim() || newTag === oldTag) { setEditingTag(null); return }
    const nt = newTag.trim().toLowerCase()
    setBusy(true)
    try {
      const replaceTag = (tags: string[]) =>
        tags.map((tg) => (tg === oldTag ? nt : tg))

      await Promise.all([
        ...bookmarks.filter((b) => b.tags.includes(oldTag)).map((b) => updateBm(b.id, { tags: replaceTag(b.tags) })),
        ...notes.filter((n) => n.tags.includes(oldTag)).map((n) => updateNt(n.id, { tags: replaceTag(n.tags) })),
        ...recipes.filter((r) => r.tags.includes(oldTag)).map((r) => updateRc(r.id, { tags: replaceTag(r.tags) })),
        ...passwords.filter((p) => p.tags.includes(oldTag)).map((p) => updatePw(p.id, { tags: replaceTag(p.tags) })),
        ...countdowns.filter((c) => c.tags.includes(oldTag)).map((c) => updateCd(c.id, { tags: replaceTag(c.tags) })),
      ])
    } finally {
      setBusy(false)
      setEditingTag(null)
    }
  }

  // Merge tag into another tag
  const handleMerge = async (fromTag: string, intoTag: string) => {
    if (!intoTag || intoTag === fromTag) { setMergingTag(null); return }
    setBusy(true)
    try {
      const mergeTag = (tags: string[]) => {
        if (!tags.includes(fromTag)) return tags
        const next = tags.filter((tg) => tg !== fromTag)
        if (!next.includes(intoTag)) next.push(intoTag)
        return next
      }
      await Promise.all([
        ...bookmarks.filter((b) => b.tags.includes(fromTag)).map((b) => updateBm(b.id, { tags: mergeTag(b.tags) })),
        ...notes.filter((n) => n.tags.includes(fromTag)).map((n) => updateNt(n.id, { tags: mergeTag(n.tags) })),
        ...recipes.filter((r) => r.tags.includes(fromTag)).map((r) => updateRc(r.id, { tags: mergeTag(r.tags) })),
        ...passwords.filter((p) => p.tags.includes(fromTag)).map((p) => updatePw(p.id, { tags: mergeTag(p.tags) })),
        ...countdowns.filter((c) => c.tags.includes(fromTag)).map((c) => updateCd(c.id, { tags: mergeTag(c.tags) })),
      ])
    } finally {
      setBusy(false)
      setMergingTag(null)
      setMergeTarget('')
    }
  }

  // Delete tag from all items
  const handleDelete = async (tag: string) => {
    setBusy(true)
    try {
      const removeTag = (tags: string[]) => tags.filter((tg) => tg !== tag)
      await Promise.all([
        ...bookmarks.filter((b) => b.tags.includes(tag)).map((b) => updateBm(b.id, { tags: removeTag(b.tags) })),
        ...notes.filter((n) => n.tags.includes(tag)).map((n) => updateNt(n.id, { tags: removeTag(n.tags) })),
        ...recipes.filter((r) => r.tags.includes(tag)).map((r) => updateRc(r.id, { tags: removeTag(r.tags) })),
        ...passwords.filter((p) => p.tags.includes(tag)).map((p) => updatePw(p.id, { tags: removeTag(p.tags) })),
        ...countdowns.filter((c) => c.tags.includes(tag)).map((c) => updateCd(c.id, { tags: removeTag(c.tags) })),
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h1>{t('tagManager', 'title')}</h1>
        <span className="item-count">{tagInfos.length}</span>
      </header>

      {busy && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ height: 3, background: 'var(--color-primary)', borderRadius: 2, animation: 'pulse 1s infinite' }} />
        </div>
      )}

      {tagInfos.length === 0 ? (
        <div className="empty-page">
          <p style={{ color: 'var(--color-text-2)' }}>{t('tagManager', 'noTags')}</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tagInfos.map((info) => (
            <div key={info.tag} style={{
              background: 'var(--color-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              boxShadow: 'var(--shadow-card)',
            }}>
              {/* Tag header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingTag === info.tag ? (
                  <>
                    <input
                      className="input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(info.tag, renameValue) }}
                      autoFocus
                    />
                    <button className="icon-btn" onClick={() => handleRename(info.tag, renameValue)}>
                      <Check size={16} style={{ color: 'var(--color-success)' }} />
                    </button>
                    <button className="icon-btn" onClick={() => setEditingTag(null)}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="tag-chip" style={{ fontSize: 13, padding: '3px 10px' }}>#{info.tag}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)' }}>
                      {t('tagManager', 'usedIn')} {info.count} {t('tagManager', 'entries')}
                      {' · '}{info.modules.join(' / ')}
                    </span>
                    <button className="icon-btn" title={t('tagManager', 'rename')}
                      onClick={() => { setEditingTag(info.tag); setRenameValue(info.tag); setMergingTag(null) }}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn" title={t('tagManager', 'merge')}
                      onClick={() => { setMergingTag(info.tag); setMergeTarget(''); setEditingTag(null) }}>
                      <Merge size={14} />
                    </button>
                    <button className="icon-btn" title={t('tagManager', 'delete')}
                      onClick={() => setPendingDeleteTag(info.tag)}>
                      <Trash2 size={14} style={{ color: 'var(--color-error)' }} />
                    </button>
                  </>
                )}
              </div>

              {/* Merge panel */}
              {mergingTag === info.tag && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>
                    {t('tagManager', 'mergeInto')}:
                  </span>
                  <select
                    className="input"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                  >
                    <option value="">-- {t('common', 'tags')} --</option>
                    {allTagNames.filter((tg) => tg !== info.tag).map((tg) => (
                      <option key={tg} value={tg}>{tg}</option>
                    ))}
                  </select>
                  <button className="icon-btn" onClick={() => handleMerge(info.tag, mergeTarget)}
                    disabled={!mergeTarget}>
                    <Check size={16} style={{ color: mergeTarget ? 'var(--color-success)' : 'var(--color-text-3)' }} />
                  </button>
                  <button className="icon-btn" onClick={() => setMergingTag(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pendingDeleteTag && (
        <ConfirmDialog
          message={t('tagManager', 'confirmDelete')}
          onConfirm={() => { handleDelete(pendingDeleteTag); setPendingDeleteTag(null) }}
          onCancel={() => setPendingDeleteTag(null)}
        />
      )}
    </div>
  )
}
