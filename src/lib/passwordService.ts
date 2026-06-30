import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import type { PasswordEntry } from '../types'


// Strip undefined values — Firestore rejects them
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

// BUG-S6-01 FIX: For updateDoc, undefined values must become deleteField()
function prepareUpdate(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  )
}

const COL = 'passwords'

function toEntry(id: string, data: Record<string, unknown>): PasswordEntry {
  return {
    id,
    userId: data.userId as string,
    site: data.site as string,
    username: data.username as string,
    encryptedPassword: data.encryptedPassword as string,
    notes: (data.notes as string) || '',
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
    isPinned: (data.isPinned as boolean) || false,
    totpSecret: (data.totpSecret as string) || undefined,
    expiresAt: data.expiresAt as number | undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribePasswords(
  userId: string,
  cb: (entries: PasswordEntry[]) => void,
  onError?: (err: { code?: string; message: string }) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => toEntry(d.id, d.data()))) },
    (err) => { onError?.({ code: err.code, message: err.message }) }
  )
}

export async function addPasswordEntry(
  userId: string,
  data: Omit<PasswordEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  await addDoc(collection(db, COL), stripUndefined({
    ...data, userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as Record<string, unknown>))
}

export async function updatePasswordEntry(id: string, data: Partial<Omit<PasswordEntry, 'id' | 'userId' | 'createdAt'>>) {
  // BUG-S6-01 FIX: use prepareUpdate so clearing expiresAt/totpSecret works
  await updateDoc(doc(db, COL, id), prepareUpdate({ ...data, updatedAt: serverTimestamp() } as Record<string, unknown>))
}

export async function deletePasswordEntry(id: string) {
  await deleteDoc(doc(db, COL, id))
}
