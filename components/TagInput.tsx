import { useState, useRef } from 'react'
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag))
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  // Commit any pending input when field loses focus
  const handleBlur = () => {
    // Delay hiding suggestions so onMouseDown on suggestion fires first
    setTimeout(() => {
      if (input.trim()) addTag(input)
      setShowSuggestions(false)
    }, 150)
  }

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s) && input.length > 0
  ).slice(0, 5)

  return (
    <div className="tag-input-wrap">
      <div
        className="tag-input-box"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); removeTag(tag) }}
              aria-label="remove"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? t('common', 'tags') : ''}
          className="tag-text-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
        />
      </div>

      {/* Add button for mobile — commits current input */}
      {input.trim().length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); addTag(input) }}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-primary)',
            background: 'var(--color-primary-light)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          + 加
        </button>
      )}

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="tag-suggestion-item"
              // Use onMouseDown instead of onClick to fire before input onBlur
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
