import { useState } from 'react'
import { Star, Eye, EyeOff, Copy, Edit2, Trash2, Pin, PinOff, ShieldCheck } from 'lucide-react'
import { usePasswordStore } from '../stores/passwordStore'
import { useAppStore } from '../stores/appStore'
import TOTPDisplay from './TOTPDisplay'
import type { PasswordEntry } from '../types'

interface Props {
  entry: PasswordEntry
  onEdit: (e: PasswordEntry) => void
}

export default function PasswordCard({ entry, onEdit }: Props) {
  const { toggleFavourite, remove, decryptPassword, recordActivity, updateFields } = usePasswordStore()
  const { t } = useAppStore()
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // F-01: toggle TOTP section visibility
  const [showTotp, setShowTotp] = useState(false)

  const decrypted = decryptPassword(entry.encryptedPassword)

  const handleCopy = async () => {
    if (!decrypted) return
    await navigator.clipboard.writeText(decrypted)
    setCopied(true)
    recordActivity()
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpiringSoon = entry.expiresAt && entry.expiresAt - Date.now() < 30 * 24 * 60 * 60 * 1000
  const isExpired = entry.expiresAt && entry.expiresAt < Date.now()

  return (
    <div className="card password-card" onClick={recordActivity}
      style={{ borderLeft: entry.isPinned ? '3px solid var(--color-primary)' : undefined }}>
      <div className="password-card-top">
        <div className="password-site-wrap">
          {/* F-03: pinned indicator */}
          {entry.isPinned && <Pin size={11} style={{ color: 'var(--color-primary)', marginRight: 4, flexShrink: 0 }} />}
          <span className="password-site">{entry.site}</span>
          {isExpired && <span className="expire-chip expired">{t('password', 'expired')}</span>}
          {!isExpired && isExpiringSoon && <span className="expire-chip expiring">{t('password', 'expiringSoon')}</span>}
          {/* F-01: TOTP badge */}
          {entry.totpSecret && (
            <button
              className="expire-chip"
              style={{
                background: showTotp ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: showTotp ? '#fff' : 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
              }}
              onClick={(e) => { e.stopPropagation(); setShowTotp(!showTotp); recordActivity() }}
            >
              <ShieldCheck size={10} /> 2FA
            </button>
          )}
        </div>
        <div className="card-actions">
          {/* F-03: pin button */}
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); updateFields(entry.id, { isPinned: !entry.isPinned }) }}
            title={entry.isPinned ? t('common', 'unpin') : t('common', 'pin')}
          >
            {entry.isPinned
              ? <PinOff size={14} style={{ color: 'var(--color-primary)' }} />
              : <Pin size={14} />}
          </button>
          <button
            className={`icon-btn star-btn ${entry.isFavourite ? 'starred' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleFavourite(entry.id, entry.isFavourite) }}
          >
            <Star size={17} fill={entry.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(entry) }}>
            <Edit2 size={17} />
          </button>
          <button
            className={`icon-btn ${confirmDelete ? 'danger-btn' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (!confirmDelete) { setConfirmDelete(true); return } remove(entry.id) }}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <p className="password-username">{entry.username}</p>

      <div className="password-row">
        <span className="password-value">
          {showPw && decrypted ? decrypted : '••••••••••••'}
        </span>
        <div className="password-actions">
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setShowPw(!showPw); recordActivity() }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button className="icon-btn copy-btn" onClick={(e) => { e.stopPropagation(); handleCopy() }}>
            {copied ? <span className="copied-text">✓</span> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* F-01: TOTP section */}
      {entry.totpSecret && showTotp && (
        <div style={{ marginTop: 8 }}>
          <TOTPDisplay secret={entry.totpSecret} onRecordActivity={recordActivity} />
        </div>
      )}

      {entry.notes && <p className="password-notes">{entry.notes}</p>}

      {entry.tags.length > 0 && (
        <div className="tags-row">
          {entry.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}
    </div>
  )
}
