import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Note } from '../types'


// Strip undefined values — Firestore rejects them
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

const COL = 'notes'

function toNote(id: string, data: Record<string, unknown>): Note {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    content: data.content as string,
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
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
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteNote(id: string) {
  await deleteDoc(doc(db, COL, id))
}
