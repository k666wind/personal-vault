import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { ocrExtractText } from '../lib/ocr'

interface Props {
  onExtracted: (text: string) => void
  label?: string
}

export default function OcrButton({ onExtracted, label }: Props) {
  const { settings, t } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!settings.claudeApiKey) {
      setError('請先在設定中填入 Claude API Key')
      return
    }
    setLoading(true)
    setError('')
    try {
      const text = await ocrExtractText(file, settings.claudeApiKey)
      onExtracted(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : '識字失敗')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="ocr-btn-wrap">
      <button
        className="btn-ocr"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        type="button"
      >
        {loading
          ? <><Loader2 size={15} className="spin" /> 識字中...</>
          : <><Camera size={15} /> {label || t('common', 'extractText')}</>
        }
      </button>
      {error && <p className="error-msg">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}
