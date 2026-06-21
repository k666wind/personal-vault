import { useState } from 'react'
import { X, AlertTriangle, Loader2, ShieldOff } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import { clearMasterVerifier } from '../lib/crypto'

interface Props {
  onClose: () => void
}

export default function ResetMasterPasswordModal({ onClose }: Props) {
  const { t } = useAppStore()
  const { entries, remove } = usePasswordStore()
  const [step, setStep] = useState<'warn' | 'confirm' | 'deleting' | 'done'>('warn')
  const [confirmText, setConfirmText] = useState('')
  const [deleteAll, setDeleteAll] = useState(true)

  const CONFIRM_WORD = 'RESET'

  const handleReset = async () => {
    setStep('deleting')
    try {
      if (deleteAll) {
        // Delete all password entries from Firestore
        for (const entry of entries) {
          await remove(entry.id)
        }
      }
      // Clear the master password verifier from localStorage
      clearMasterVerifier()
      setStep('done')
    } catch {
      setStep('confirm')
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ color: 'var(--color-error)' }}>
            <ShieldOff size={18} style={{ display: 'inline', marginRight: 6 }} />
            {t('password', 'language') === 'en' ? 'Reset Master Password' : '重設主密碼'}
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {step === 'warn' && (
            <>
              <div style={{
                background: 'var(--color-danger-light)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                gap: 10,
              }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                  <strong>⚠️ 重要警告</strong><br />
                  主密碼係用 AES-256 加密所有密碼。<strong>忘記主密碼就無法解密已儲存的密碼。</strong><br /><br />
                  重設後你可以選擇：<br />
                  • 保留加密記錄（但永遠無法讀取）<br />
                  • 或者刪除所有密碼，重新開始
                </div>
              </div>

              <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                💡 如果你<strong>記得主密碼</strong>，請關閉此彈窗，用「更換主密碼」功能代替。
              </div>

              {/* Option: delete all or keep */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="deleteMode" checked={deleteAll} onChange={() => setDeleteAll(true)} />
                  <span><strong>刪除所有密碼記錄</strong>（推薦）<br />
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>清除 {entries.length} 個密碼 + 重設主密碼</span>
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="deleteMode" checked={!deleteAll} onChange={() => setDeleteAll(false)} />
                  <span><strong>只重設主密碼</strong>（保留加密記錄）<br />
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>舊密碼記錄將永遠無法解密</span>
                  </span>
                </label>
              </div>

              <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
                <button className="btn-ghost" onClick={onClose}>{t('common', 'cancel')}</button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--color-error)' }}
                  onClick={() => setStep('confirm')}
                >
                  繼續
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
                輸入 <strong style={{ color: 'var(--color-error)' }}>{CONFIRM_WORD}</strong> 確認重設：
              </p>
              <input
                type="text"
                className="input"
                placeholder={CONFIRM_WORD}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                autoFocus
              />
              <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
                <button className="btn-ghost" onClick={() => setStep('warn')}>{t('common', 'cancel')}</button>
                <button
                  className="btn-primary"
                  style={{ background: confirmText === CONFIRM_WORD ? 'var(--color-error)' : undefined, opacity: confirmText === CONFIRM_WORD ? 1 : 0.5 }}
                  onClick={handleReset}
                  disabled={confirmText !== CONFIRM_WORD}
                >
                  確認重設
                </button>
              </div>
            </>
          )}

          {step === 'deleting' && (
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
              <p style={{ color: 'var(--color-text-2)' }}>
                {deleteAll ? `正在刪除 ${entries.length} 個密碼...` : '正在重設主密碼...'}
              </p>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>重設完成</p>
              <p style={{ color: 'var(--color-text-2)', fontSize: 13, lineHeight: 1.6 }}>
                主密碼已重設。下次進入密碼頁面，輸入任意新主密碼即可開始使用。
              </p>
              <button className="btn-primary" onClick={onClose}>完成</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
