import { useState } from 'react'
import { X, Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import {
  getNotificationLog, markNotificationRead, markAllNotificationsRead,
  clearNotificationLog, type NotificationLogEntry,
} from '../lib/notifications'

interface Props {
  onClose: () => void
}

export default function NotificationInbox({ onClose }: Props) {
  const { settings } = useAppStore()
  const lang = settings.language
  const [entries, setEntries] = useState<NotificationLogEntry[]>(() => getNotificationLog())

  const handleRead = (id: string) => {
    markNotificationRead(id)
    setEntries(getNotificationLog())
  }

  const handleReadAll = () => {
    markAllNotificationsRead()
    setEntries(getNotificationLog())
  }

  const handleClear = () => {
    clearNotificationLog()
    setEntries([])
  }

  const formatTime = (ms: number) => {
    const diff = Date.now() - ms
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return lang === 'zh' ? '\u525b\u525b' : 'Just now'
    if (mins < 60) return lang === 'zh' ? `${mins} \u5206\u9418\u524d` : `${mins}m ago`
    if (hours < 24) return lang === 'zh' ? `${hours} \u5c0f\u6642\u524d` : `${hours}h ago`
    return lang === 'zh' ? `${days} \u65e5\u524d` : `${days}d ago`
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 800, background: 'rgba(0,0,0,0.3)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        position: 'absolute', top: 60, right: 16, left: 16,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--color-border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {lang === 'zh' ? '\u901a\u77e5\u4e2d\u5fc3' : 'Notifications'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {entries.some((e) => !e.read) && (
              <button className="icon-btn" title={lang === 'zh' ? '\u5168\u90e8\u8b80\u53d6' : 'Mark all read'} onClick={handleReadAll}>
                <CheckCheck size={15} />
              </button>
            )}
            {entries.length > 0 && (
              <button className="icon-btn" title={lang === 'zh' ? '\u6e05\u9664\u5168\u90e8' : 'Clear all'} onClick={handleClear}>
                <Trash2 size={15} style={{ color: 'var(--color-danger)' }} />
              </button>
            )}
            <button className="icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {entries.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
              <Bell size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>{lang === 'zh' ? '\u5c1a\u672a\u6709\u901a\u77e5' : 'No notifications yet'}</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  background: entry.read ? 'transparent' : 'var(--color-primary-light)',
                  cursor: entry.read ? 'default' : 'pointer',
                }}
                onClick={() => !entry.read && handleRead(entry.id)}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: entry.read ? 'transparent' : 'var(--color-primary)',
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: entry.read ? 400 : 600, margin: 0 }}>{entry.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '2px 0 0' }}>
                    {entry.body} · {formatTime(entry.firedAt)}
                  </p>
                </div>
                {!entry.read && (
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleRead(entry.id) }}>
                    <Check size={13} style={{ color: 'var(--color-primary)' }} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
