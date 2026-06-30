// F-07: Push Notification for Reminders
// Uses Web Notification API (foreground only; background via FCM requires Blaze plan)

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export function showNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    tag,
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
  })
}

// Returns a key for localStorage to track which reminders have already fired
function firedKey(id: string) {
  return `vault-notif-fired:${id}`
}

export interface ReminderItem {
  id: string
  title: string
  reminderAt?: number
  moduleType: 'note' | 'countdown'
}

// BUG-40 FIX: Prune fired keys older than 7 days to prevent localStorage bloat
export function pruneOldFiredKeys() {
  const prefix = 'vault-notif-fired:'
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const toDelete: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      // Key format: vault-notif-fired:{id}-{reminderAt}
      // Extract reminderAt from the end
      const parts = key.slice(prefix.length).split('-')
      const ts = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(ts) && ts < cutoff) toDelete.push(key)
    }
  }
  toDelete.forEach((k) => localStorage.removeItem(k))
}


// S6-D: Notification Inbox — log fired notifications to localStorage
export interface NotificationLogEntry {
  id: string
  title: string
  body: string
  firedAt: number
  moduleType: 'note' | 'countdown'
  read: boolean
}

const LOG_KEY = 'vault-notif-log'
const MAX_LOG = 50

export function getNotificationLog(): NotificationLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

export function addNotificationLog(entry: Omit<NotificationLogEntry, 'read'>) {
  const log = getNotificationLog()
  const updated = [{ ...entry, read: false }, ...log].slice(0, MAX_LOG)
  localStorage.setItem(LOG_KEY, JSON.stringify(updated))
}

export function markNotificationRead(id: string) {
  const log = getNotificationLog()
  const updated = log.map((e) => e.id === id ? { ...e, read: true } : e)
  localStorage.setItem(LOG_KEY, JSON.stringify(updated))
}

export function markAllNotificationsRead() {
  const log = getNotificationLog()
  const updated = log.map((e) => ({ ...e, read: true }))
  localStorage.setItem(LOG_KEY, JSON.stringify(updated))
}

export function clearNotificationLog() {
  localStorage.removeItem(LOG_KEY)
}

export function getUnreadNotificationCount(): number {
  return getNotificationLog().filter((e) => !e.read).length
}

export function checkAndFireReminders(items: ReminderItem[]) {
  if (Notification.permission !== 'granted') return
  const now = Date.now()
  for (const item of items) {
    if (!item.reminderAt) continue
    // Fire if within a 2-minute window (checker runs every 60s)
    const diff = now - item.reminderAt
    if (diff >= 0 && diff < 120_000) {
      const key = firedKey(`${item.id}-${item.reminderAt}`)
      if (localStorage.getItem(key)) continue // already fired
      const body = item.moduleType === 'countdown' ? '⏰ 倒數提醒' : '📝 筆記提醒'
      showNotification(item.title, body, item.id)
      localStorage.setItem(key, '1')
      // S6-D: log to notification inbox
      addNotificationLog({ id: `${item.id}-${item.reminderAt}`, title: item.title, body, firedAt: now, moduleType: item.moduleType })
    }
  }
}
