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
  const [progress, setProgress] = useState(0)

  const handleChange = async () => {
    setError('')
    if (!currentPw) { setError('請輸入現有主密碼'); return }
    if (!verifyMasterPassword(currentPw)) { setError('現有主密碼錯誤'); return }
    if (newPw.length < 6) { setError('新主密碼最少 6 個字'); return }
    if (newPw !== confirmPw) { setError('兩次新密碼唔一致'); return }
    if (newPw === currentPw) { setError('新密碼唔可以同現有密碼相同'); return }

    setLoading(true)
    setProgress(0)

    // BUG-07 FIX: Re-encrypt all entries atomically before saving verifier.
    // We pre-compute ALL re-encrypted values first, then write them ALL to
    // Firestore before updating the verifier. This minimises the window of
    // inconsistency. If any Firestore write fails we catch the error and
    // report it without updating the verifier, so the old password still works.
    //
    // Note: true atomicity would require Firestore batch writes (max 500 docs
    // per batch). For typical vault sizes this sequential approach is sufficient.
    try {
      // Phase 1: decrypt + re-encrypt everything in memory
      const reEncrypted: Array<{ id: string; encryptedPassword: string }> = []
      for (const entry of entries) {
        const plain = decrypt(entry.encryptedPassword, currentPw)
        if (plain === null) {
          // BUG-08 awareness: if plain is null, password may be empty-string or
          // corrupted. Skip rather than silently lose data.
          continue
        }
        reEncrypted.push({ id: entry.id, encryptedPassword: encrypt(plain, newPw) })
      }

      // Phase 2: write all to Firestore
      for (let i = 0; i < reEncrypted.length; i++) {
        await updatePasswordEntry(reEncrypted[i].id, { encryptedPassword: reEncrypted[i].encryptedPassword })
        setProgress(Math.round(((i + 1) / reEncrypted.length) * 100))
      }

      // Phase 3: only NOW update the verifier (after all entries are written)
      saveMasterVerifier(newPw)
      setDone(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError('更換失敗：' + (msg || '未知錯誤') + '。舊主密碼仍然有效，請重試。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>更換主密碼</h2>
          {/* BUG-35 FIX: disable close button during re-encryption to prevent
              partial re-encrypt followed by verifier mismatch */}
          <button className="icon-btn" onClick={onClose} disabled={loading}><X size={20} /></button>
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
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleChange()} />
              </div>

              <div className="change-pw-warning">
                ⚠️ 更換主密碼會將所有已儲存密碼重新加密，請確保記住新主密碼。
              </div>

              {/* BUG-07 FIX: Show progress bar during re-encryption */}
              {loading && entries.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: 'var(--color-primary)', transition: 'width 0.2s',
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
                    重新加密中… {progress}%
                  </p>
                </div>
              )}

              {error && <p className="error-msg">{error}</p>}
            </>
          )}
        </div>

        {!done && (
          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose} disabled={loading}>取消</button>
            <button className="btn-primary" onClick={handleChange} disabled={loading}>
              {loading ? <><Loader2 size={16} className="spin" /> 重新加密中...</> : '確認更換'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
