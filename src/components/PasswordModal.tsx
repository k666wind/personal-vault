import { useState } from 'react'
import { X, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import TagInput from './TagInput'
import { scorePassword, generatePassword } from '../lib/crypto'
import { isValidTOTPSecret, parseOtpAuthUri } from '../lib/totp'
import type { PasswordEntry } from '../types'

interface Props {
  entry?: PasswordEntry
  onClose: () => void
  allTags: string[]
}

export default function PasswordModal({ entry, onClose, allTags }: Props) {
  const { t, user } = useAppStore()
  const { add, update, decryptPassword } = usePasswordStore()
  const isEdit = !!entry

  const [site, setSite] = useState(entry?.site || '')
  const [username, setUsername] = useState(entry?.username || '')
  const [password, setPassword] = useState(isEdit ? (decryptPassword(entry.encryptedPassword) || '') : '')
  const [notes, setNotes] = useState(entry?.notes || '')
  const [tags, setTags] = useState<string[]>(entry?.tags || [])
  const [expiresAt, setExpiresAt] = useState(
    entry?.expiresAt ? new Date(entry.expiresAt).toISOString().slice(0, 10) : ''
  )
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Generator options
  const [genLength, setGenLength] = useState(16)
  const [genSymbols, setGenSymbols] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  // F-01: TOTP secret
  const [totpSecret, setTotpSecret] = useState(entry?.totpSecret || '')
  const [totpError, setTotpError] = useState('')
  const [showTotpField, setShowTotpField] = useState(!!entry?.totpSecret)

  const strength = scorePassword(password)
  const strengthLabels = [t('password', 'weak'), t('password', 'weak'), t('password', 'fair'), t('password', 'strong'), t('password', 'veryStrong')]
  const strengthColors = ['#e5e7eb', '#ef4444', '#f59e0b', '#3b82f6', '#16a34a']

  const handleGenerate = () => {
    const pw = generatePassword(genLength, { upper: true, numbers: true, symbols: genSymbols })
    setPassword(pw)
    setShowPw(true)
  }

  const handleSave = async () => {
    if (!site.trim()) { setError(t('password', 'siteRequired')); return }
    if (!username.trim()) { setError(t('password', 'usernameRequired')); return }
    if (!password) { setError(t('password', 'passwordRequired')); return }
    setSaving(true)
    try {
      // F-01: validate and include TOTP secret
      if (totpSecret && !isValidTOTPSecret(totpSecret)) {
        setTotpError(t('password', 'totpInvalid'))
        setSaving(false)
        return
      }
      const extra: { notes: string; tags: string[]; expiresAt?: number; totpSecret?: string } = { notes, tags }
      if (totpSecret.trim()) extra.totpSecret = totpSecret.trim().replace(/\s/g, '').toUpperCase()
      if (expiresAt) extra.expiresAt = new Date(expiresAt).getTime()
      if (isEdit) {
        await update(entry.id, site.trim(), username.trim(), password, extra)
      } else {
        await add(user!.uid, site.trim(), username.trim(), password, extra)
      }
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? (e as Error).message : ''
      if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
        setError(t('error', 'permissionError'))
      } else if (msg.includes('network') || msg.includes('unavailable')) {
        setError(t('error', 'networkError'))
      } else {
        setError(t('error', 'saveFailed') + (msg || t('error', 'unknownError')))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h2>{isEdit ? t('common', 'edit') : t('password', 'add')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">{t('password', 'site')}</label>
            <input className="input" placeholder="Google, Netflix..." value={site} onChange={(e) => setSite(e.target.value)} autoFocus={!isEdit} />
          </div>

          <div className="field">
            <label className="field-label">{t('password', 'username')}</label>
            <input className="input" placeholder="user@example.com" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="field">
            <div className="field-label-row">
              <label className="field-label">{t('password', 'password')}</label>
              <button className="btn-add-row" onClick={() => setShowGenerator(!showGenerator)}>
                <RefreshCw size={12} /> {t('password', 'generate')}
              </button>
            </div>
            <div className="input-with-icon">
              <input
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button className="icon-btn pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength meter */}
            {password && (
              <div className="strength-wrap">
                <div className="strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="strength-segment"
                      style={{ background: i <= strength ? strengthColors[strength] : '#e5e7eb' }} />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}

            {/* Generator panel */}
            {showGenerator && (
              <div className="generator-panel">
                <div className="gen-row">
                  <span className="field-label">{t('password', 'genLength')}：{genLength}</span>
                  <input type="range" min={8} max={32} value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} className="gen-slider" />
                </div>
                <div className="gen-row">
                  <label className="gen-check-label">
                    <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} />
                    {t('password', 'genSymbols')}
                  </label>
                </div>
                <button className="btn-primary" style={{ padding: '8px' }} onClick={handleGenerate}>
                  生成密碼
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label className="field-label">{t('password', 'expiresAt')}</label>
            <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">{t('password', 'notes')}</label>
            <textarea className="input" rows={2} placeholder={t("password", "notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

          {/* F-01: TOTP / 2FA section */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">
                {t('password', 'totp')}
                <span className="optional-hint"> {t('common', 'optional')}</span>
              </label>
              <button className="btn-add-row" onClick={() => { setShowTotpField(!showTotpField); setTotpSecret(''); setTotpError('') }}>
                {showTotpField ? t('password', 'totpRemove') : t('password', 'totpAdd')}
              </button>
            </div>
            {showTotpField && (
              <div>
                <input
                  className="input"
                  placeholder={t('password', 'totpSecretPlaceholder')}
                  value={totpSecret}
                  onChange={(e) => {
                    const val = e.target.value
                    setTotpSecret(val)
                    setTotpError('')
                    // Auto-parse otpauth:// URIs pasted from QR code apps
                    if (val.startsWith('otpauth://')) {
                      const parsed = parseOtpAuthUri(val)
                      if (parsed) setTotpSecret(parsed.secret)
                    }
                  }}
                />
                {totpError && <p className="error-msg" style={{ marginTop: 4 }}>{totpError}</p>}
                <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                  💡 支援 Base32 Secret 或 otpauth:// URI（從 QR Code App 複製）
                </p>
              </div>
            )}
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
