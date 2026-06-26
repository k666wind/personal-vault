// F-07: Hook that periodically checks all items with reminderAt timestamps
// and fires browser notifications when they come due.
// Runs a check every 60 seconds while the app is in the foreground.
import { useEffect } from 'react'
import { useNoteStore } from '../stores/noteStore'
import { useCountdownStore } from '../stores/countdownStore'
import { checkAndFireReminders, type ReminderItem } from '../lib/notifications'

export function useReminderChecker() {
  const { notes } = useNoteStore()
  const { items: countdowns } = useCountdownStore()

  useEffect(() => {
    const buildItems = (): ReminderItem[] => [
      ...notes
        .filter((n) => n.reminderAt)
        .map((n) => ({ id: n.id, title: n.title, moduleType: 'note', reminderAt: n.reminderAt! })),
      ...countdowns
        .filter((c) => c.reminderAt)
        .map((c) => ({ id: c.id, title: c.title, moduleType: 'countdown', reminderAt: c.reminderAt! })),
    ]

    // Check immediately on mount, then every 60 seconds
    checkAndFireReminders(buildItems())
    const interval = setInterval(() => checkAndFireReminders(buildItems()), 60_000)
    return () => clearInterval(interval)
  }, [
    notes.map((n) => `${n.id}:${n.reminderAt}`).join(','),
    countdowns.map((c) => `${c.id}:${c.reminderAt}`).join(','),
  ])
}
