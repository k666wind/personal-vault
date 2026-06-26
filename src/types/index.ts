export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark' | 'system'

export type ModuleType = 'recipe' | 'bookmark' | 'password' | 'note' | 'countdown'

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

// ── Recipe ──────────────────────────────────────────────
export interface Ingredient {
  id: string
  name: string
  amount: string
  unit: string
  inShoppingList?: boolean
}

export interface RecipeStep {
  id: string
  order: number
  description: string
  duration?: number
}

export interface Nutrition {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export interface Recipe {
  id: string
  userId: string
  title: string
  description?: string
  ingredients: Ingredient[]
  steps: RecipeStep[]
  cookTime?: number
  prepTime?: number
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  nutrition?: Nutrition
  tags: string[]
  isFavourite: boolean
  isPublic?: boolean
  createdAt: number
  updatedAt: number
}

// ── Bookmark ─────────────────────────────────────────────
export interface Bookmark {
  id: string
  userId: string
  url: string
  title: string
  description?: string
  favicon?: string
  tags: string[]
  isFavourite: boolean
  isPinned?: boolean   // F-03
  isRead?: boolean     // future F-09
  readAt?: number      // future F-09
  createdAt: number
  updatedAt: number
}

// ── Password ─────────────────────────────────────────────
export interface PasswordEntry {
  id: string
  userId: string
  site: string
  username: string
  encryptedPassword: string
  totpSecret?: string  // F-01 TOTP
  notes?: string
  tags: string[]
  isFavourite: boolean
  isPinned?: boolean   // F-03
  expiresAt?: number
  createdAt: number
  updatedAt: number
}

// ── Note ─────────────────────────────────────────────────
export interface Note {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  isFavourite: boolean
  isPinned?: boolean   // F-03
  reminderAt?: number
  createdAt: number
  updatedAt: number
}

// ── Date Countdown ───────────────────────────────────────
export interface DateCountdown {
  id: string
  userId: string
  title: string
  notes?: string
  targetDate: number
  tags: string[]
  isFavourite: boolean
  isPinned?: boolean   // F-03
  reminderAt?: number
  createdAt: number
  updatedAt: number
}

// ── Reminder ─────────────────────────────────────────────
export interface Reminder {
  id: string
  moduleType: ModuleType
  itemId: string
  itemTitle: string
  message: string
  dueAt: number
  read: boolean
}

// ── Settings ─────────────────────────────────────────────
export interface AppSettings {
  language: Language
  theme: Theme
  claudeApiKey?: string
  passwordLockTimeout: number
}

// ── Meal Planner ─────────────────────────────────────────
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealPlanEntry {
  recipeId: string
  recipeName: string  // denormalised for offline display
}

// weekStart = Monday midnight (local) epoch ms
export interface MealPlan {
  id: string
  userId: string
  weekStart: number
  // key = "mon-dinner", "tue-lunch", etc.
  slots: Record<string, MealPlanEntry>
  createdAt: number
  updatedAt: number
}
