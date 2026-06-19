import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Bookmark } from '../types'

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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribeBookmarks(
  userId: string,
  cb: (bookmarks: Bookmark[]) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => toBookmark(d.id, d.data())))
  })
}

export async function addBookmark(
  userId: string,
  data: Omit<Bookmark, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  await addDoc(collection(db, COL), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateBookmark(
  id: string,
  data: Partial<Omit<Bookmark, 'id' | 'userId' | 'createdAt'>>
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBookmark(id: string) {
  await deleteDoc(doc(db, COL, id))
}
