import { useEffect } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmDialog({ message, onConfirm, onCancel, danger = true }: Props) {
  const { t } = useAppStore()

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ alignItems: 'center' }}>
      <div
        className="modal"
        style={{ borderRadius: 'var(--radius-xl)', maxWidth: 320, margin: '0 16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '24px 20px 8px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {danger
              ? <Trash2 size={22} style={{ color: 'var(--color-error)' }} />
              : <AlertTriangle size={22} style={{ color: '#ca8a04' }} />}
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer" style={{ paddingTop: 12 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
            {t('common', 'cancel')}
          </button>
          <button
            className="btn-primary"
            style={{
              flex: 1,
              background: danger ? 'var(--color-error)' : 'var(--color-primary)',
            }}
            onClick={onConfirm}
          >
            {t('common', 'confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
