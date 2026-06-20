import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}

export default function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const { t } = useAppStore()
  const [input, setInput] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag))
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  const filteredSuggestions = suggestions.filter(
    (s) => s.includes(input.toLowerCase()) && !tags.includes(s) && input.length > 0
  ).slice(0, 5)

  return (
    <div className="tag-input-wrap">
      <div className="tag-input-box">
        {tags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button onClick={() => removeTag(tag)} aria-label="remove">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? t('common', 'tags') : ''}
          className="tag-text-input"
        />
      </div>
      {filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.map((s) => (
            <button key={s} className="tag-suggestion-item" onClick={() => addTag(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
