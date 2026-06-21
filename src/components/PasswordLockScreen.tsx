import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { usePasswordStore } from '../stores/passwordStore'
import { hasMasterPasswordSet } from '../lib/crypto'
import { useAppStore } from '../stores/appStore'
import ResetMasterPasswordModal from './ResetMasterPasswordModal'

interface Props {
  onUnlocked: () => void
}

export default function PasswordLockScreen({ onUnlocked }: Props) {
  const { unlock } = usePasswordStore()
  const { t } = useAppStore()
  const [master, setMaster] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const isFirstTime = !hasMasterPasswordSet()

  const handleUnlock = () => {
    if (!master.trim()) return
    const ok = unlock(master)
    if (ok) {
      onUnlocked()
    } else {
      setError(t('password', 'language') === 'en' ? 'Incorrect master password' : '主密碼錯誤')
      setMaster('')
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-icon-wrap">
          <Lock size={32} />
        </div>
        <h2 className="lock-title">{t('password', 'masterPassword')}</h2>
        <p className="lock-hint">
          {isFirstTime
            ? '首次使用——請設定一個主密碼，用於加密所有密碼。請妥善保管，遺失後無法恢復。'
            : t('password', 'enterMaster')}
        </p>

        <div className="lock-input-row">
          <input
            type={showPw ? 'text' : 'password'}
            className="input"
            placeholder="••••••••"
            value={master}
            onChange={(e) => { setMaster(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            autoFocus
          />
          <button className="icon-btn" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button className="btn-primary" onClick={handleUnlock} disabled={!master.trim()}>
          {isFirstTime ? '設定主密碼' : t('password', 'unlock')}
        </button>

        {!isFirstTime && (
          <button
            onClick={() => setShowReset(true)}
            style={{
              fontSize: 13,
              color: 'var(--color-error)',
              textDecoration: 'underline',
              marginTop: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            忘記主密碼？
          </button>
        )}

        <p className="lock-warning">
          ⚠️ {isFirstTime ? '此密碼無法重設，請記好' : '忘記主密碼將無法存取已儲存嘅密碼'}
        </p>
      </div>

      {showReset && <ResetMasterPasswordModal onClose={() => setShowReset(false)} />}
    </div>
  )
}
