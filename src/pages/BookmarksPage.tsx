import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Star, Tag, X, RefreshCw, CheckSquare, BookOpen, Pin, Upload, FileText, AlertTriangle, Check, Archive } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import BookmarkCard from '../components/BookmarkCard'
import BookmarkModal from '../components/BookmarkModal'
import BulkActionBar from '../components/BulkActionBar'
import ConfirmDialog from '../components/ConfirmDialog'
import { parseBookmarkHtml } from '../lib/bookmarkHtmlImport'
import type { Bookmark } from '../types'
import type { ImportedBookmark } from '../lib/bookmarkHtmlImport'

export default function BookmarksPage() {
  const { t, user, settings } = useAppStore()
  const { bookmarks, loading, error, init, teardown, add, update, remove } = useBookmarkStore()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Bookmark | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [showPinOnly, setShowPinOnly] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [showArchiveOnly, setShowArchiveOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  // S6-B: HTML import state
  const [showImport, setShowImport] = useState(false)
  const [importItems, setImportItems] = useState<ImportedBookmark[]>([])
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set())
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  const lang = settings.language

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const unreadCount = useMemo(() => bookmarks.filter((b) => !b.isRead).length, [bookmarks])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    bookmarks.forEach((b) => (b.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [bookmarks])

  const existingUrls = useMemo(() => new Set(bookmarks.map((b) => b.url)), [bookmarks])

  const filtered = useMemo(() => {
    const f = bookmarks.filter((b) => {
      // S6-E: hide archived by default; show only when archive filter is active
      if (showArchiveOnly) {
        if (!b.isArchived) return false
      } else {
        if (b.isArchived) return false
      }
      if (showFavOnly && !b.isFavourite) return false
      if (showPinOnly && !b.isPinned) return false
      if (showUnreadOnly && b.isRead) return false
      if (filterTag && !b.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q) || b.tags.some((tg) => tg.includes(q))
      }
      return true
    })
    return [...f.filter((b) => b.isPinned), ...f.filter((b) => !b.isPinned)]
  }, [bookmarks, search, filterTag, showFavOnly, showPinOnly, showUnreadOnly, showArchiveOnly])

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map((id) => remove(id)))
      setSelected(new Set())
      setBulkMode(false)
    } catch {
      alert(t('error', 'saveFailed'))
    }
  }

  const handleBulkAddTag = async (tag: string) => {
    await Promise.all(
      [...selected].map((id) => {
        const item = bookmarks.find((b) => b.id === id)
        if (!item || item.tags.includes(tag)) return Promise.resolve()
        return update(id, { tags: [...item.tags, tag] })
      })
    )
  }

  // S6-B: Parse HTML file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const html = ev.target?.result as string
      const result = parseBookmarkHtml(html)
      setImportItems(result.bookmarks)
      setImportErrors(result.errors)
      // Pre-select all non-duplicate items
      const preSelected = new Set<number>()
      result.bookmarks.forEach((b, i) => {
        if (!existingUrls.has(b.url)) preSelected.add(i)
      })
      setImportSelected(preSelected)
      setImportDone(false)
    }
    reader.readAsText(file)
    // Reset input so same file can be picked again
    e.target.value = ''
  }

  const handleImportConfirm = async () => {
    if (!user || importSelected.size === 0) return
    setImporting(true)
    try {
      const toImport = [...importSelected].map((i) => importItems[i])
      // Import in batches of 10 to avoid Firestore rate limits
      const BATCH = 10
      for (let i = 0; i < toImport.length; i += BATCH) {
        await Promise.all(
          toImport.slice(i, i + BATCH).map((bm) =>
            add(user.uid, {
              url: bm.url,
              title: bm.title,
              description: '',
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32`,
              tags: bm.tags,
              isFavourite: false,
              isPinned: false,
              isRead: false,
            })
          )
        )
      }
      setImportDone(true)
      setTimeout(() => {
        setShowImport(false)
        setImportItems([])
        setImportSelected(new Set())
        setImportDone(false)
      }, 1500)
    } catch (err) {
      setImportErrors([`Import failed: ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setImporting(false)
    }
  }

  const [searchParams] = useSearchParams()
  const actionParam = searchParams.get('action')
  useEffect(() => {
    if (actionParam === 'add') setShowModal(true)
  }, [actionParam])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (b: Bookmark) => {
    if (bulkMode) { toggleSelect(b.id); return }
    setEditTarget(b); setShowModal(true)
  }

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
        <p className="error-state-hint">{error}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retry')}</button>
      </div>
    )
    if (filtered.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">{'\uD83D\uDD17'}</div>
        <p>{bookmarks.length === 0 ? (lang === 'zh' ? '未有網址，點右下角新增' : 'No bookmarks yet. Tap + to add.') : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {filtered.map((b) => (
          <div key={b.id} className={`selectable-wrap ${bulkMode && selected.has(b.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(b.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(b.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <BookmarkCard bookmark={b} onEdit={openEdit} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('bookmark', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* S6-B: Import button */}
          <button className="icon-btn" title={lang === 'zh' ? '匯入瀏覽器書籤' : 'Import bookmarks'} onClick={() => setShowImport(true)}>
            <Upload size={18} />
          </button>
          <button className="icon-btn" title={t('tagManager', 'title')} onClick={() => navigate('/tags')}>
            <Tag size={18} />
          </button>
          <button className="icon-btn" title={t('bulk', 'select')} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <span className="item-count">{bookmarks.length}</span>
        </div>
      </header>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size}
          totalCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((b) => b.id)))}
          onDeselectAll={() => setSelected(new Set())}
          onDelete={() => setShowBulkConfirm(true)}
          onAddTag={handleBulkAddTag}
          onCancel={() => { setBulkMode(false); setSelected(new Set()) }}
          allTags={allTags}
        />
      )}

      <div className="search-bar" style={{ margin: '12px 16px 8px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" className="search-input" placeholder={t('common', 'search')}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${showFavOnly ? 'active' : ''}`} onClick={() => setShowFavOnly(!showFavOnly)}>
          <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />{t('common', 'favourites')}
        </button>
        <button className={`filter-chip ${showPinOnly ? 'active' : ''}`} onClick={() => setShowPinOnly(!showPinOnly)}>
          <Pin size={13} />{t('common', 'pinned')}
        </button>
        <button className={`filter-chip ${showUnreadOnly ? 'active' : ''}`} onClick={() => setShowUnreadOnly(!showUnreadOnly)}>
          <BookOpen size={13} />
          {lang === 'zh' ? `\u672a\u8b80${unreadCount > 0 ? ` (${unreadCount})` : ''}` : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        </button>
        <button className={`filter-chip ${showArchiveOnly ? 'active' : ''}`} onClick={() => setShowArchiveOnly(!showArchiveOnly)}>
          <Archive size={13} />{lang === 'zh' ? '封存' : 'Archived'}
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
        <button className="fab" onClick={openAdd} aria-label={t('bookmark', 'add')}><Plus size={24} /></button>
      )}

      {showModal && (
        <BookmarkModal bookmark={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />
      )}
      {showBulkConfirm && (
        <ConfirmDialog
          message={t('bulk', 'confirmDelete')}
          onConfirm={() => { setShowBulkConfirm(false); handleBulkDelete() }}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}

      {/* S6-B: HTML Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal modal-tall">
            <div className="modal-header">
              <h2>{lang === 'zh' ? '\u5319\u5165\u700f\u89bd\u5668\u66f8\u7c64' : 'Import Browser Bookmarks'}</h2>
              <button className="icon-btn" onClick={() => setShowImport(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {importItems.length === 0 ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
                    {lang === 'zh'
                      ? '支援 Chrome、Firefox、Safari、Edge 匯出的 HTML 書籤檔案。\n在瀏覽器書籤管理員選擇「匯出書籤」得到 .html 檔。'
                      : 'Supports HTML bookmark files exported from Chrome, Firefox, Safari, and Edge. Open your browser\'s Bookmark Manager and choose "Export bookmarks" to get a .html file.'}
                  </p>
                  <div
                    className="import-drop-zone"
                    onClick={() => importFileRef.current?.click()}
                  >
                    <FileText size={32} style={{ color: 'var(--color-text-3)', marginBottom: 8 }} />
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>
                      {lang === 'zh' ? '\u9078\u64c7 HTML \u6a94\u6848' : 'Select HTML file'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                      {lang === 'zh' ? '\u9ede\u64ca\u4e0a\u8f09' : 'Click to upload'}
                    </p>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".html,.htm"
                      style={{ display: 'none' }}
                      onChange={handleImportFile}
                    />
                  </div>
                  {importErrors.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {importErrors.map((e, i) => (
                        <p key={i} style={{ fontSize: 12, color: 'var(--color-error)' }}>
                          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />{e}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                      {lang === 'zh'
                        ? `找到 ${importItems.length} 個書籤，已選 ${importSelected.size} 個`
                        : `Found ${importItems.length} bookmarks, ${importSelected.size} selected`}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => setImportSelected(new Set(importItems.map((_, i) => i)))}>
                        {lang === 'zh' ? '\u5168\u9078' : 'All'}
                      </button>
                      <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => setImportSelected(new Set())}>
                        {lang === 'zh' ? '\u53d6\u6d88' : 'None'}
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    {importItems.map((bm, i) => {
                      const isDupe = existingUrls.has(bm.url)
                      const checked = importSelected.has(i)
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setImportSelected((prev) => {
                              const next = new Set(prev)
                              next.has(i) ? next.delete(i) : next.add(i)
                              return next
                            })
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            borderBottom: i < importItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                            cursor: 'pointer', opacity: isDupe ? 0.5 : 1,
                            background: checked ? 'var(--color-primary-light)' : 'transparent',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            background: checked ? 'var(--color-primary)' : 'var(--color-surface-2)',
                            border: checked ? 'none' : '1.5px solid var(--color-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <Check size={12} style={{ color: '#fff' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bm.title || bm.url}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {bm.url}
                            </p>
                            {bm.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                                {bm.tags.map((tg, ti) => (
                                  <span key={ti} className="tag" style={{ fontSize: 10, padding: '1px 6px' }}>{tg}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isDupe && (
                            <span style={{ fontSize: 10, color: 'var(--color-text-3)', flexShrink: 0 }}>
                              {lang === 'zh' ? '\u5df2\u5b58\u5728' : 'exists'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {importErrors.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {importErrors.map((e, i) => (
                        <p key={i} style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                          <AlertTriangle size={10} style={{ display: 'inline', marginRight: 3 }} />{e}
                        </p>
                      ))}
                    </div>
                  )}
                  {importDone && (
                    <p style={{ marginTop: 10, color: 'var(--color-success)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                      <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
                      {lang === 'zh' ? '\u5320\u5165\u5b8c\u6210\uff01' : 'Import complete!'}
                    </p>
                  )}
                </>
              )}
            </div>
            {importItems.length > 0 && !importDone && (
              <div className="modal-footer">
                <button className="btn-ghost" onClick={() => { setImportItems([]); setImportSelected(new Set()) }}>
                  {lang === 'zh' ? '\u91cd\u65b0\u9078\u6a94' : 'Choose another file'}
                </button>
                <button
                  className="btn-primary"
                  disabled={importSelected.size === 0 || importing}
                  onClick={handleImportConfirm}
                >
                  {importing
                    ? (lang === 'zh' ? '\u532f\u5165\u4e2d...' : 'Importing...')
                    : (lang === 'zh' ? `\u532f\u5165 ${importSelected.size} \u500b` : `Import ${importSelected.size}`)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
