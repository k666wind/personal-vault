import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Recipe } from '../types'

const COL = 'recipes'

function toRecipe(id: string, data: Record<string, unknown>): Recipe {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    description: (data.description as string) || '',
    ingredients: (data.ingredients as Recipe['ingredients']) || [],
    steps: (data.steps as Recipe['steps']) || [],
    cookTime: data.cookTime as number | undefined,
    prepTime: data.prepTime as number | undefined,
    servings: data.servings as number | undefined,
    difficulty: data.difficulty as Recipe['difficulty'],
    nutrition: (data.nutrition as Recipe['nutrition']) || {},
    tags: (data.tags as string[]) || [],
    isFavourite: (data.isFavourite as boolean) || false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export function subscribeRecipes(
  userId: string,
  cb: (recipes: Recipe[]) => void,
  onError?: (err: { code?: string; message: string }) => void
) {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map((d) => toRecipe(d.id, d.data()))) },
    (err) => { onError?.({ code: err.code, message: err.message }) }
  )
}

export async function addRecipe(
  userId: string,
  data: Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  await addDoc(collection(db, COL), { ...data, userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function updateRecipe(id: string, data: Partial<Omit<Recipe, 'id' | 'userId' | 'createdAt'>>) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteRecipe(id: string) {
  await deleteDoc(doc(db, COL, id))
}
