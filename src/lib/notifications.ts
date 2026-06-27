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
      showNotification(item.title, item.moduleType === 'countdown' ? '⏰ 倒數提醒' : '📝 筆記提醒', item.id)
      localStorage.setItem(key, '1')
    }
  }
}
