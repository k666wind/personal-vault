import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp, deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Note } from '../types'

const COL = 'notes'

// Strip undefined values for addDoc (Firestore rejects undefined)
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

// BUG-25 FIX: For updateDoc, keys whose value is undefined must be sent as
// deleteField() so Firestore actually removes the old value. Without this,
// omitting the key leaves the old value in place (e.g. clearing a reminder
// would have no effect because updateDoc only touches provided keys).
function prepareUpdate(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  )
}

function toNote(id: string, data: Record<string, unknown>): Note {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    content: data.content as string,
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
    isPinned: (data.isPinned as boolean) || false,
    reminderAt: data.reminderAt as number | undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribeNotes(
  userId: string,
  cb: (notes: Note[]) => void,
  onError?: (err: { code?: string; message: string }) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => toNote(d.id, d.data()))) },
    (err) => { onError?.({ code: err.code, message: err.message }) }
  )
}

export async function addNote(
  userId: string,
  data: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  await addDoc(collection(db, COL), stripUndefined({
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>))
}

export async function updateNote(
  id: string,
  data: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>
) {
  // BUG-25 FIX: use prepareUpdate (undefined → deleteField) instead of
  // stripUndefined (undefined → omit), so clearing reminderAt actually
  // removes it from Firestore rather than leaving the old value intact.
  await updateDoc(doc(db, COL, id), prepareUpdate({
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>))
}

export async function deleteNote(id: string) {
  await deleteDoc(doc(db, COL, id))
}
