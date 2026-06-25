import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, Download, Upload, Loader2, Sun, Moon } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useCountdownStore } from '../stores/countdownStore'
import { addCountdown } from '../lib/countdownService'
import { parseExternalExport, type ImportFormat } from '../lib/externalImport'
import { usePasswordStore } from '../stores/passwordStore'
import { exportJson, exportCsv, importJson, type VaultExport } from '../lib/exportImport'
import { encrypt } from '../lib/crypto'
import { addBookmark } from '../lib/bookmarkService'
import { addNote } from '../lib/noteService'
import { addRecipe } from '../lib/recipeService'
import { addPasswordEntry } from '../lib/passwordService'

export default function SettingsPage() {
  const { t, settings, setLanguage, setTheme, setClaudeApiKey, setLockTimeout, user } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(settings.claudeApiKey || '')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  // F-08: external password manager import
  const [extImporting, setExtImporting] = useState(false)
  const [extImportMsg, setExtImportMsg] = useState('')
  const extImportRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const { bookmarks } = useBookmarkStore()
  const { notes } = useNoteStore()
  const { recipes } = useRecipeStore()
  const { entries: passwords, masterPassword } = usePasswordStore()
  const { items: countdowns } = useCountdownStore()

  const handleExportJson = () => {
    exportJson({ version: 2, exportedAt: Date.now(), recipes, bookmarks, notes, passwords, countdowns })
  }
  const handleExportCsv = () => exportCsv(bookmarks, notes)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImporting(true)
    setImportMsg('')
    try {
      const data: VaultExport = await importJson(file)
      let count = 0
      for (const b of (data.bookmarks || [])) {
        await addBookmark(user.uid, { url: b.url, title: b.title, description: b.description, favicon: b.favicon, tags: b.tags, isFavourite: b.isFavourite })
        count++
      }
      for (const n of (data.notes || [])) {
        await addNote(user.uid, { title: n.title, content: n.content, tags: n.tags, isFavourite: n.isFavourite, reminderAt: n.reminderAt })
        count++
      }
      for (const r of (data.recipes || [])) {
        await addRecipe(user.uid, { title: r.title, description: r.description, ingredients: r.ingredients, steps: r.steps, cookTime: r.cookTime, prepTime: r.prepTime, servings: r.servings, difficulty: r.difficulty, nutrition: r.nutrition, tags: r.tags, isFavourite: r.isFavourite })
        count++
      }
      for (const p of (data.passwords || [])) {
        await addPasswordEntry(user.uid, { site: p.site, username: p.username, encryptedPassword: p.encryptedPassword, notes: p.notes, tags: p.tags, isFavourite: p.isFavourite, expiresAt: p.expiresAt })
        count++
      }
      // BUG-13 FIX: countdowns were missing from export/import
      for (const c of (data.countdowns || [])) {
        await addCountdown(user.uid, { title: c.title, notes: c.notes, targetDate: c.targetDate, tags: c.tags, isFavourite: c.isFavourite, reminderAt: c.reminderAt })
        count++
      }
      setImportMsg(settings.language === 'en'
        ? `Successfully imported ${count} items`
        : `成功匯入 ${count} 筆資料`)
    } catch (e) {
      setImportMsg(t('error', 'saveFailed') + (e instanceof Error ? e.message : t('error', 'unknownError')))
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  // F-08: Import from Chrome / 1Password / Bitwarden
  const handleExternalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!masterPassword) {
      setExtImportMsg(settings.language === 'en'
        ? 'Please unlock your password vault first'
        : '請先解鎖密碼庫再匯入')
      return
    }
    setExtImporting(true)
    setExtImportMsg('')
    try {
      const text = await file.text()
      const { format, entries: imported } = parseExternalExport(text)
      if (format === 'unknown' || imported.length === 0) {
        setExtImportMsg(t('settings', 'importExternalFail'))
        return
      }
      const formatNames: Record<ImportFormat, string> = {
        chrome: 'Chrome', '1password': '1Password', bitwarden: 'Bitwarden', unknown: ''
      }
      let count = 0
      for (const imp of imported) {
        const encryptedPassword = encrypt(imp.password, masterPassword)
        await addPasswordEntry(user.uid, {
          site: imp.site,
          username: imp.username,
          encryptedPassword,
          notes: imp.notes,
          tags: [],
          isFavourite: false,
        })
        count++
      }
      setExtImportMsg(
        t('settings', 'importExternalSuccess').replace('{n}', String(count)) +
        ` (${formatNames[format]})`
      )
    } catch (err) {
      setExtImportMsg(t('error', 'saveFailed') + (err instanceof Error ? err.message : ''))
    } finally {
      setExtImporting(false)
      if (extImportRef.current) extImportRef.current.value = ''
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h1>{t('settings', 'title')}</h1>
        <div style={{ width: 36 }} />
      </header>

      <div className="settings-list">

        {/* Language */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'language')}</p>
          <div className="lang-toggle">
            <button className={settings.language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>中文</button>
            <button className={settings.language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>English</button>
          </div>
        </div>

        {/* Theme */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'theme')}</p>
          <div className="lang-toggle">
            <button
              className={settings.theme === 'light' ? 'active' : ''}
              onClick={() => setTheme('light')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sun size={14} /> {t('settings', 'themeLight')}
            </button>
            <button
              className={settings.theme === 'dark' ? 'active' : ''}
              onClick={() => setTheme('dark')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Moon size={14} /> {t('settings', 'themeDark')}
            </button>
            <button
              className={settings.theme === 'system' ? 'active' : ''}
              onClick={() => setTheme('system')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              💻 {t('settings', 'themeSystem')}
            </button>
          </div>
        </div>

        {/* Claude API Key */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'claudeApiKey')}</p>
          <p className="settings-hint">{t('settings', 'claudeApiKeyHint')}</p>
          <div className="api-key-row">
            <input type={showApiKey ? 'text' : 'password'} className="input" placeholder="sk-ant-..."
              value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={() => setClaudeApiKey(apiKeyInput)} />
            <button className="icon-btn" onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Lock timeout */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'lockTimeout')}</p>
          <div className="timeout-options">
            {[1, 5, 10, 30].map((mins) => (
              <button key={mins}
                className={`timeout-btn ${settings.passwordLockTimeout === mins ? 'active' : ''}`}
                onClick={() => setLockTimeout(mins)}>
                {mins}
              </button>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'exportData')}</p>
          <p className="settings-hint">
            {t('recipe', 'title')} {recipes.length} · {t('bookmark', 'title')} {bookmarks.length} · {t('note', 'title')} {notes.length} · {t('password', 'title')} {passwords.length}
          </p>
          <div className="export-btns">
            <button className="btn-export" onClick={handleExportJson}>
              <Download size={15} /> {t('settings', 'exportJson')}
            </button>
            <button className="btn-export" onClick={handleExportCsv}>
              <Download size={15} /> {t('settings', 'exportCsv')}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'importData')}</p>
          <button className="btn-export" onClick={() => importRef.current?.click()} disabled={importing}>
            {importing
              ? <><Loader2 size={14} className="spin" /> {t('common', 'loading')}</>
              : <><Upload size={15} /> {t('settings', 'importData')}</>}
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          {importMsg && (
            <p className={`import-msg ${importMsg.includes('失敗') || importMsg.includes('failed') ? 'error-msg' : 'success-msg'}`}>
              {importMsg}
            </p>
          )}
        </div>

        {/* F-08: External password manager import */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'importExternal')}</p>
          <p className="settings-hint">{t('settings', 'importExternalHint')}</p>
          <button className="btn-export" onClick={() => extImportRef.current?.click()} disabled={extImporting}>
            {extImporting
              ? <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 6 }} /> {t('common', 'loading')}</>
              : <><Upload size={15} /> {t('settings', 'importExternal')}</>}
          </button>
          <input ref={extImportRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleExternalImport} />
          {extImportMsg && (
            <p className={`import-msg ${extImportMsg.includes('失敗') || extImportMsg.includes('failed') || extImportMsg.includes('Error') || extImportMsg.includes('無法') || extImportMsg.includes('請先') ? 'error-msg' : 'success-msg'}`}>
              {extImportMsg}
            </p>
          )}
        </div>

        {/* Sign out */}
        <div className="settings-section">
          <button className="btn-danger" onClick={signOut}>{t('auth', 'signOut')}</button>
        </div>

      </div>
    </div>
  )
}
