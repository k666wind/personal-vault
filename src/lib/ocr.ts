// Convert image file to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // strip data:...;base64,
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type OcrMode = 'text' | 'recipe'

// Extract plain text from image
export async function ocrExtractText(
  file: File,
  apiKey: string
): Promise<string> {
  const base64 = await fileToBase64(file)
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: '請提取呢張圖片入面所有文字，保留原有格式同換行。只輸出文字內容，唔需要任何解釋。',
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export interface RecipeOcrResult {
  title: string
  description: string
  ingredients: Array<{ name: string; amount: string; unit: string }>
  steps: Array<{ description: string; duration?: number }>
  cookTime?: number
  prepTime?: number
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  nutrition?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
}

// Extract structured recipe from image
export async function ocrExtractRecipe(
  file: File,
  apiKey: string
): Promise<RecipeOcrResult> {
  const base64 = await fileToBase64(file)
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `請從呢張食譜圖片提取所有資料，以JSON格式輸出，格式如下（只輸出JSON，唔需要markdown或解釋）：
{
  "title": "食譜名稱",
  "description": "簡短描述",
  "ingredients": [{"name": "食材名", "amount": "份量數字", "unit": "單位如克/毫升/個"}],
  "steps": [{"description": "步驟描述", "duration": 分鐘數字或null}],
  "cookTime": 烹飪分鐘或null,
  "prepTime": 準備分鐘或null,
  "servings": 份量人數或null,
  "difficulty": "easy/medium/hard或null",
  "nutrition": {"calories": 卡路里或null, "protein": 蛋白質克或null, "carbs": 碳水克或null, "fat": 脂肪克或null}
}`,
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
