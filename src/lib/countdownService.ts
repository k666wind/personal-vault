import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { DateCountdown } from '../types'

const COL = 'countdowns'

// Strip undefined values — Firestore rejects them
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

function toCountdown(id: string, data: Record<string, unknown>): DateCountdown {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    notes: (data.notes as string) || undefined,
    targetDate: data.targetDate as number,
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
    reminderAt: data.reminderAt as number | undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribeCountdowns(
  userId: string,
  cb: (items: DateCountdown[]) => void,
  onError?: (err: { code?: string; message: string }) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => toCountdown(d.id, d.data()))) },
    (err) => { onError?.({ code: err.code, message: err.message }) }
  )
}

export async function addCountdown(
  userId: string,
  data: Omit<DateCountdown, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  const payload = stripUndefined({
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, COL), payload)
}

export async function updateCountdown(
  id: string,
  data: Partial<Omit<DateCountdown, 'id' | 'userId' | 'createdAt'>>
) {
  const payload = stripUndefined({ ...data, updatedAt: serverTimestamp() })
  await updateDoc(doc(db, COL, id), payload)
}

export async function deleteCountdown(id: string) {
  await deleteDoc(doc(db, COL, id))
}
