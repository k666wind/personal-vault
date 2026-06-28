// F-07: Polls notes + countdowns every 60s and fires browser notifications
// BUG-36 FIX: Init note + countdown stores here so reminders fire even when
// the user hasn't visited NotesPage or CountdownPage yet.
// Note: each store's init() calls teardown() internally before re-subscribing,
// so calling init() from multiple places is safe (idempotent).
import { useEffect } from 'react'
import { useNoteStore } from '../stores/noteStore'
import { useCountdownStore } from '../stores/countdownStore'
import { checkAndFireReminders, pruneOldFiredKeys } from '../lib/notifications'

export function useReminderChecker(userId: string | null | undefined) {
  const notes = useNoteStore((s) => s.notes)
  const countdowns = useCountdownStore((s) => s.items)
  const initNotes = useNoteStore((s) => s.init)
  const subscribeCountdowns = useCountdownStore((s) => s.subscribe)

  // BUG-36 FIX: Subscribe stores when user authenticates.
  // We do NOT teardown here — individual pages manage their own teardown.
  // init() is idempotent: it internally teardowns before re-subscribing.
  useEffect(() => {
    if (!userId) return
    // Only init if store is not already subscribed (unsubscribe is null = not yet init)
    const noteUnsub = useNoteStore.getState().unsubscribe
    if (!noteUnsub) initNotes(userId)
    const cdUnsub = useCountdownStore.getState().unsubscribe
    if (!cdUnsub) subscribeCountdowns(userId)
  }, [userId])

  useEffect(() => {
    // Prune old fired keys on mount (BUG-40 fix)
    pruneOldFiredKeys()

    const run = () => {
      const noteItems = notes
        .filter((n) => n.reminderAt)
        .map((n) => ({ id: n.id, title: n.title, reminderAt: n.reminderAt, moduleType: 'note' as const }))
      const countdownItems = countdowns
        .filter((c) => c.reminderAt)
        .map((c) => ({ id: c.id, title: c.title, reminderAt: c.reminderAt, moduleType: 'countdown' as const }))
      checkAndFireReminders([...noteItems, ...countdownItems])
    }

    run()
    const id = setInterval(run, 60_000)
    return () => clearInterval(id)
  }, [notes, countdowns])
}
