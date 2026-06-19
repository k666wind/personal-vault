export type Language = 'zh' | 'en'

export type ModuleType = 'recipe' | 'bookmark' | 'password' | 'note'

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
  duration?: number // minutes
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
  cookTime?: number // minutes
  prepTime?: number // minutes
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  nutrition?: Nutrition
  tags: string[]
  imageUrl?: string
  isFavourite: boolean
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
  imageUrl?: string
  tags: string[]
  isFavourite: boolean
  createdAt: number
  updatedAt: number
}

// ── Password ─────────────────────────────────────────────
export interface PasswordEntry {
  id: string
  userId: string
  site: string
  username: string
  encryptedPassword: string // AES-256 encrypted
  notes?: string
  tags: string[]
  isFavourite: boolean
  expiresAt?: number // timestamp
  createdAt: number
  updatedAt: number
}

// ── Note ─────────────────────────────────────────────────
export interface Note {
  id: string
  userId: string
  title: string
  content: string
  imageUrl?: string
  tags: string[]
  isFavourite: boolean
  reminderAt?: number // timestamp
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
  claudeApiKey?: string
  passwordLockTimeout: number // minutes
}
