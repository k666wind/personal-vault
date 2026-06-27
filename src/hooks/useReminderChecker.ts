// F-07: Polls notes + countdowns every 60s and fires browser notifications
import { useEffect } from 'react'
import { useNoteStore } from '../stores/noteStore'
import { useCountdownStore } from '../stores/countdownStore'
import { checkAndFireReminders } from '../lib/notifications'

export function useReminderChecker() {
  const notes = useNoteStore((s) => s.notes)
  const countdowns = useCountdownStore((s) => s.items)

  useEffect(() => {
    const run = () => {
      const noteItems = notes
        .filter((n) => n.reminderAt)
        .map((n) => ({ id: n.id, title: n.title, reminderAt: n.reminderAt, moduleType: 'note' as const }))
      const countdownItems = countdowns
        .filter((c) => c.reminderAt)
        .map((c) => ({ id: c.id, title: c.title, reminderAt: c.reminderAt, moduleType: 'countdown' as const }))
      checkAndFireReminders([...noteItems, ...countdownItems])
    }

    run() // run immediately on mount / when items change
    const id = setInterval(run, 60_000)
    return () => clearInterval(id)
  }, [notes, countdowns])
}
