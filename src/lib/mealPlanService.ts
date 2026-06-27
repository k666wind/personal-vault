import {
  collection, doc, setDoc, getDoc, query, where,
  orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { MealPlan } from '../types'

const COL = 'mealPlans'

function docId(userId: string, weekStart: number) {
  return `${userId}_${weekStart}`
}

function toMealPlan(id: string, data: Record<string, unknown>): MealPlan {
  return {
    id,
    userId: data.userId as string,
    weekStart: data.weekStart as number,
    days: (data.days as MealPlan['days']) || {},
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

export async function getMealPlan(userId: string, weekStart: number): Promise<MealPlan | null> {
  const ref = doc(db, COL, docId(userId, weekStart))
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return toMealPlan(snap.id, snap.data() as Record<string, unknown>)
}

export async function saveMealPlan(userId: string, weekStart: number, days: MealPlan['days']): Promise<void> {
  const ref = doc(db, COL, docId(userId, weekStart))
  await setDoc(ref, {
    userId,
    weekStart,
    days,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Subscribe to recent meal plans for this user (last 8 weeks)
export function subscribeMealPlans(userId: string, cb: (plans: MealPlan[]) => void) {
  const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 60 * 60 * 1000
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    where('weekStart', '>=', eightWeeksAgo),
    orderBy('weekStart', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => toMealPlan(d.id, d.data() as Record<string, unknown>)))
  })
}
