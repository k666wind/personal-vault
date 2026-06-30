import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp, deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Bookmark } from '../types'


// Strip undefined values — Firestore rejects them
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

// BUG-S6-01 FIX: For updateDoc, keys whose value is undefined must become
// deleteField() so Firestore actually removes the old value (e.g. clearing readAt).
function prepareUpdate(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  )
}

const COL = 'bookmarks'

function toBookmark(id: string, data: Record<string, unknown>): Bookmark {
  return {
    id,
    userId: data.userId as string,
    url: data.url as string,
    title: data.title as string,
    description: (data.description as string) || '',
    favicon: (data.favicon as string) || '',
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
    isPinned: (data.isPinned as boolean) || false,
    isRead: (data.isRead as boolean) || false,
    readAt: data.readAt as number | undefined,
    isArchived: (data.isArchived as boolean) || false,   // S6-E
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribeBookmarks(
  userId: string,
  cb: (bookmarks: Bookmark[]) => void,
  onError?: (err: { code?: string; message: string }) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => toBookmark(d.id, d.data()))) },
    (err) => { onError?.({ code: err.code, message: err.message }) }
  )
}

export async function addBookmark(
  userId: string,
  data: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  await addDoc(collection(db, COL), stripUndefined({
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>))
}

export async function updateBookmark(
  id: string,
  data: Partial<Omit<Bookmark, 'id' | 'userId' | 'createdAt'>>
) {
  // BUG-S6-01 FIX: use prepareUpdate so clearing optional fields (readAt etc) works
  await updateDoc(doc(db, COL, id), prepareUpdate({
    ...data,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>))
}

export async function deleteBookmark(id: string) {
  await deleteDoc(doc(db, COL, id))
}
