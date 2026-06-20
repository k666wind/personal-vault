import { useState } from 'react'
import { Star, Eye, EyeOff, Copy, Edit2, Trash2 } from 'lucide-react'
import { usePasswordStore } from '../stores/passwordStore'
import { useAppStore } from '../stores/appStore'
import type { PasswordEntry } from '../types'

interface Props {
  entry: PasswordEntry
  onEdit: (e: PasswordEntry) => void
}

export default function PasswordCard({ entry, onEdit }: Props) {
  const { toggleFavourite, remove, decryptPassword, recordActivity } = usePasswordStore()
  const { t } = useAppStore()
  const [showPw, setShowPw] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    <div className="card password-card" onClick={recordActivity}>
      <div className="password-card-top">
        <div className="password-site-wrap">
          <span className="password-site">{entry.site}</span>
          {isExpired && <span className="expire-chip expired">{t('password', 'expired')}</span>}
          {!isExpired && isExpiringSoon && <span className="expire-chip expiring">{t('password', 'expiringSoon')}</span>}
        </div>
        <div className="card-actions">
          <button
            className={`icon-btn star-btn ${entry.isFavourite ? 'starred' : ''}`}
            onClick={() => toggleFavourite(entry.id, entry.isFavourite)}
          >
            <Star size={17} fill={entry.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={() => onEdit(entry)}><Edit2 size={17} /></button>
          <button
            className={`icon-btn ${confirmDelete ? 'danger-btn' : ''}`}
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return } remove(entry.id) }}
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
          <button className="icon-btn" onClick={() => { setShowPw(!showPw); recordActivity() }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button className="icon-btn copy-btn" onClick={handleCopy}>
            {copied ? <span className="copied-text">✓</span> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {entry.notes && <p className="password-notes">{entry.notes}</p>}

      {entry.tags.length > 0 && (
        <div className="tags-row">
          {entry.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}
    </div>
  )
}
