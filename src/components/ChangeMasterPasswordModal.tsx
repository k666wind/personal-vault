import { useState } from 'react'
import { X, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { usePasswordStore } from '../stores/passwordStore'
import { encrypt, decrypt, saveMasterVerifier, verifyMasterPassword } from '../lib/crypto'
import { updatePasswordEntry } from '../lib/passwordService'

interface Props {
  onClose: () => void
}

export default function ChangeMasterPasswordModal({ onClose }: Props) {
  const { entries } = usePasswordStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleChange = async () => {
    setError('')
    if (!currentPw) { setError('請輸入現有主密碼'); return }
    if (!verifyMasterPassword(currentPw)) { setError('現有主密碼錯誤'); return }
    if (newPw.length < 6) { setError('新主密碼最少 6 個字'); return }
    if (newPw !== confirmPw) { setError('兩次新密碼唔一致'); return }
    if (newPw === currentPw) { setError('新密碼唔可以同現有密碼相同'); return }

    setLoading(true)
    try {
      // Re-encrypt all password entries with new master password
      for (const entry of entries) {
        const plain = decrypt(entry.encryptedPassword, currentPw)
        if (plain !== null) {
          const reEncrypted = encrypt(plain, newPw)
          await updatePasswordEntry(entry.id, { encryptedPassword: reEncrypted })
        }
      }
      // Save new verifier
      saveMasterVerifier(newPw)
      setDone(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError('更換失敗：' + (msg || '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>更換主密碼</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {done ? (
            <div className="change-pw-done">
              <ShieldCheck size={48} style={{ color: 'var(--color-success)' }} />
              <p className="done-title">主密碼已更換</p>
              <p className="done-hint">所有 {entries.length} 個密碼已重新加密。請用新主密碼重新登入。</p>
              <button className="btn-primary" onClick={() => { usePasswordStore.getState().lock(); onClose() }}>
                確認並鎖定
              </button>
            </div>
          ) : (
            <>
              <div className="field">
                <label className="field-label">現有主密碼</label>
                <div className="lock-input-row">
                  <input type={showCurrent ? 'text' : 'password'} className="input"
                    placeholder="••••••••" value={currentPw}
                    onChange={(e) => { setCurrentPw(e.target.value); setError('') }} autoFocus />
                  <button className="icon-btn" onClick={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field-label">新主密碼</label>
                <div className="lock-input-row">
                  <input type={showNew ? 'text' : 'password'} className="input"
                    placeholder="最少 6 個字" value={newPw}
                    onChange={(e) => { setNewPw(e.target.value); setError('') }} />
                  <button className="icon-btn" onClick={() => setShowNew(!showNew)}>
                    {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field-label">確認新主密碼</label>
                <input type="password" className="input" placeholder="再輸入一次"
                  value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleChange()} />
              </div>

              <div className="change-pw-warning">
                ⚠️ 更換主密碼會將所有已儲存密碼重新加密，請確保記住新主密碼。
              </div>

              {error && <p className="error-msg">{error}</p>}
            </>
          )}
        </div>

        {!done && (
          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={handleChange} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> 重新加密中...</> : '確認更換'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
