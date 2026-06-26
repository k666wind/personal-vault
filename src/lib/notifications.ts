// F-07: Web Push Notification for Reminders
// Strategy: use the browser's Notification API + a scheduled check.
// Full FCM push (background notifications) requires Firebase Cloud Functions
// (Blaze plan). This implementation covers the majority use case:
//   • In-app: shows a toast when the app is open and a reminder is due
//   • PWA foreground: uses Notification API for native banner
//
// The service worker (vite-plugin-pwa/Workbox) handles background delivery
// via the `push` event when FCM is configured. This file wires up the
// permission request and schedules the periodic foreground check.

export type NotificationPermission = 'granted' | 'denied' | 'default'

/**
 * Request notification permission from the browser.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result as NotificationPermission
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission as NotificationPermission
}

/**
 * Show a native browser notification (requires granted permission).
 */
export function showNotification(title: string, body: string, tag?: string) {
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: tag || title, // deduplicate same-tag notifications
      silent: false,
    })
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000)
  } catch {
    // Some browsers block Notification in certain contexts (e.g. iframes)
  }
}

/**
 * Fired reminders registry — stored in sessionStorage so we don't
 * re-fire the same reminder during the current session.
 */
function getFiredSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem('vault-fired-reminders')
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function markFired(key: string) {
  const set = getFiredSet()
  set.add(key)
  sessionStorage.setItem('vault-fired-reminders', JSON.stringify([...set]))
}

export interface ReminderItem {
  id: string
  title: string
  moduleType: string
  reminderAt: number
}

/**
 * Check a list of items with reminderAt timestamps and fire notifications
 * for any that are overdue and haven't been fired this session.
 * Returns the IDs of items that were notified.
 */
export function checkAndFireReminders(items: ReminderItem[]): string[] {
  const now = Date.now()
  const fired: string[] = []
  const firedSet = getFiredSet()

  for (const item of items) {
    if (!item.reminderAt) continue
    // Fire if reminder is in the past and not yet fired this session
    const key = `${item.id}:${item.reminderAt}`
    if (item.reminderAt <= now && !firedSet.has(key)) {
      showNotification(
        `⏰ ${item.title}`,
        `提醒：${item.title}`,
        key
      )
      markFired(key)
      fired.push(item.id)
    }
  }
  return fired
}
