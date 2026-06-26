// F-01: Inline TOTP code display component.
// Shows the 6-digit code with a countdown ring and auto-refreshes every second.
import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, ShieldCheck } from 'lucide-react'
import { generateTOTP, totpSecondsRemaining } from '../lib/totp'

interface Props {
  secret: string
  onRecordActivity?: () => void
}

export default function TOTPDisplay({ secret, onRecordActivity }: Props) {
  const [code, setCode] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(30)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(() => {
    setCode(generateTOTP(secret))
    setSeconds(totpSecondsRemaining())
  }, [secret])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleCopy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    onRecordActivity?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!code) return (
    <span style={{ fontSize: 11, color: 'var(--color-error)' }}>⚠️ 無效 TOTP Secret</span>
  )

  // Colour shifts red when < 7 seconds remain
  const urgency = seconds <= 7
  const progressPct = (seconds / 30) * 100

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-md)',
      padding: '6px 10px',
      border: `1px solid ${urgency ? 'var(--color-error)' : 'var(--color-border)'}`,
    }}>
      <ShieldCheck size={14} style={{ color: urgency ? 'var(--color-error)' : 'var(--color-primary)', flexShrink: 0 }} />

      {/* Code */}
      <span style={{
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '0.15em',
        color: urgency ? 'var(--color-error)' : 'var(--color-text)',
        flex: 1,
      }}>
        {code.slice(0, 3)} {code.slice(3)}
      </span>

      {/* Countdown bar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 10, color: urgency ? 'var(--color-error)' : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
          {seconds}s
        </span>
        <div style={{ width: 28, height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: urgency ? 'var(--color-error)' : 'var(--color-primary)',
            transition: 'width 1s linear, background 0.3s',
          }} />
        </div>
      </div>

      {/* Copy */}
      <button
        className="icon-btn"
        onClick={handleCopy}
        title="複製 TOTP 碼"
        style={{ color: copied ? 'var(--color-success)' : undefined }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}
