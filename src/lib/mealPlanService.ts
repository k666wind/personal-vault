// F-10: Firestore service for MealPlan (one document per user per week)
import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { MealPlan } from '../types'

const COL = 'mealPlans'

function toMealPlan(id: string, data: Record<string, unknown>): MealPlan {
  return {
    id,
    userId: data.userId as string,
    weekStart: data.weekStart as number,
    slots: (data.slots as MealPlan['slots']) || {},
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now(),
  }
}

/** Get the Monday of the week containing the given date (local midnight ms). */
export function getWeekStart(date: Date = new Date()): number {
  const d = new Date(date)
  const day = d.getDay()
  // Shift so Monday=0 (JS Sunday=0)
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Build the Firestore document ID for a user's week plan. */
function planDocId(userId: string, weekStart: number) {
  return `${userId}_${weekStart}`
}

/** Get or create a MealPlan document for the given week. */
export async function getMealPlan(userId: string, weekStart: number): Promise<MealPlan> {
  const id = planDocId(userId, weekStart)
  const ref = doc(db, COL, id)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return toMealPlan(snap.id, snap.data() as Record<string, unknown>)
  }
  // Create empty plan
  const newPlan: Omit<MealPlan, 'id'> = {
    userId, weekStart, slots: {},
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  await setDoc(ref, { ...newPlan, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return { id, ...newPlan }
}

/** Subscribe to a week's meal plan (realtime). */
export function subscribeMealPlan(
  userId: string,
  weekStart: number,
  cb: (plan: MealPlan) => void
): () => void {
  const id = planDocId(userId, weekStart)
  const ref = doc(db, COL, id)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) cb(toMealPlan(snap.id, snap.data() as Record<string, unknown>))
  })
}

/** Upsert a slot in the meal plan. slotKey = "mon-dinner". */
export async function setMealSlot(
  userId: string,
  weekStart: number,
  slotKey: string,
  entry: MealPlan['slots'][string] | null
): Promise<void> {
  const id = planDocId(userId, weekStart)
  const ref = doc(db, COL, id)
  const snap = await getDoc(ref)

  const field = `slots.${slotKey}`
  if (!snap.exists()) {
    // Create document first
    await setDoc(ref, {
      userId, weekStart,
      slots: entry ? { [slotKey]: entry } : {},
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  } else if (entry === null) {
    // Remove slot using a partial update
    const currentSlots = (snap.data()?.slots || {}) as Record<string, unknown>
    delete currentSlots[slotKey]
    await updateDoc(ref, { slots: currentSlots, updatedAt: serverTimestamp() })
  } else {
    await updateDoc(ref, { [field]: entry, updatedAt: serverTimestamp() })
  }
}

/** Subscribe to multiple weeks (for bulk ingredient aggregation). */
export function subscribeMealPlans(
  userId: string,
  cb: (plans: MealPlan[]) => void
): () => void {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('weekStart', 'desc')
  )
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => toMealPlan(d.id, d.data() as Record<string, unknown>)))
  })
}
