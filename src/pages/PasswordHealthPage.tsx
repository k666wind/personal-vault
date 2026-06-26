import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, ShieldAlert, Copy, Lock, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import { scorePassword } from '../lib/crypto'
import { checkMultipleBreaches } from '../lib/breach'

interface DecryptedEntry {
  id: string; site: string; username: string
  plain: string; strength: number; expiresAt?: number
}

export default function PasswordHealthPage() {
  const { t } = useAppStore()
  const navigate = useNavigate()
  const { entries, decryptPassword, isLocked } = usePasswordStore()
  // F-02: breach state
  const [breachMap, setBreachMap] = useState<Map<string, number | null> | null>(null)
  const [breachChecking, setBreachChecking] = useState(false)
  const [breachError, setBreachError] = useState('')

  const analysis = useMemo(() => {
    if (isLocked) return { score: 0, duplicates: [], weak: [], expiring: [], decrypted: [] }

    const decrypted: DecryptedEntry[] = entries.map((e) => ({
      id: e.id, site: e.site, username: e.username,
      plain: decryptPassword(e.encryptedPassword) || '',
      strength: scorePassword(decryptPassword(e.encryptedPassword) || ''),
      expiresAt: e.expiresAt,
    }))

    const pwMap = new Map<string, string[]>()
    for (const d of decrypted) {
      if (!d.plain) continue
      const existing = pwMap.get(d.plain) || []
      existing.push(d.site)
      pwMap.set(d.plain, existing)
    }
    const duplicates = decrypted.filter((d) => (pwMap.get(d.plain)?.length || 0) > 1)
    const weak = decrypted.filter((d) => d.strength <= 1)
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const expiring = decrypted.filter((d) => d.expiresAt && d.expiresAt - now < thirtyDays)

    const total = entries.length || 1
    const penalty = (duplicates.length / total) * 30 + (weak.length / total) * 30 +
      (expiring.length / total) * 20 +
      (breachMap ? ([...breachMap.values()].filter((v) => v && v > 0).length / total) * 20 : 0)
    const score = Math.max(0, Math.round(100 - penalty))

    return { score, duplicates, weak, expiring, decrypted }
  }, [entries.map((e) => e.id + ':' + e.encryptedPassword).sort().join('|'), isLocked, breachMap])

  // F-02: run breach check
  const handleBreachCheck = useCallback(async () => {
    if (isLocked || analysis.decrypted.length === 0) return
    setBreachChecking(true)
    setBreachError('')
    try {
      const toCheck = analysis.decrypted
        .filter((d) => d.plain)
        .map((d) => ({ id: d.id, plain: d.plain }))
      const results = await checkMultipleBreaches(toCheck)
      setBreachMap(results)
    } catch {
      setBreachError(t('password', 'breachError'))
    } finally {
      setBreachChecking(false)
    }
  }, [analysis.decrypted, isLocked])

  const breachedEntries = useMemo(() => {
    if (!breachMap) return []
    return analysis.decrypted.filter((d) => {
      const count = breachMap.get(d.id)
      return count !== null && count !== undefined && count > 0
    })
  }, [analysis.decrypted, breachMap])

  const scoreColor = analysis.score >= 80 ? 'var(--color-success)'
    : analysis.score >= 50 ? '#f59e0b' : 'var(--color-error)'

  const handleCopy = (text: string) => navigator.clipboard.writeText(text).catch(() => {})

  if (isLocked) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => navigate('/passwords')}><ChevronLeft size={22} /></button>
          <h1>{t('password', 'health')}</h1>
          <div style={{ width: 36 }} />
        </header>
        <div className="empty-page">
          <Lock size={48} style={{ color: 'var(--color-text-3)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-2)' }}>請先解鎖密碼庫</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/passwords')}>前往解鎖</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/passwords')}><ChevronLeft size={22} /></button>
        <h1>{t('password', 'health')}</h1>
        <div style={{ width: 36 }} />
      </header>

      <div style={{ padding: '16px' }}>
        {/* Score */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'var(--color-card)', borderRadius: 16, padding: '20px 32px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{analysis.score}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>{t('password', 'healthScore')}</div>
            <div style={{ marginTop: 10 }}>
              {analysis.score >= 80 ? <ShieldCheck size={28} style={{ color: 'var(--color-success)' }} /> : <ShieldAlert size={28} style={{ color: scoreColor }} />}
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: t('password', 'duplicates'), count: analysis.duplicates.length, color: '#ef4444' },
            { label: t('password', 'weak_passwords'), count: analysis.weak.length, color: '#f59e0b' },
            { label: t('password', 'expiring'), count: analysis.expiring.length, color: '#8b5cf6' },
            { label: t('password', 'breached'), count: breachedEntries.length, color: '#dc2626' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ flex: '1 1 auto', background: 'var(--color-card)', borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-card)', borderLeft: `3px solid ${count > 0 ? color : 'var(--color-success)'}` }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: count > 0 ? color : 'var(--color-success)' }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* F-02: Breach check button */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handleBreachCheck}
            disabled={breachChecking}
            style={{
              width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-primary)', background: 'transparent',
              color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: breachChecking ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} className={breachChecking ? 'spin' : ''} />
            {breachChecking ? t('password', 'breachChecking') : t('password', 'breachCheckAll')}
          </button>
          {breachMap && !breachChecking && (
            <p style={{ fontSize: 12, color: breachedEntries.length > 0 ? 'var(--color-error)' : 'var(--color-success)', textAlign: 'center', marginTop: 6 }}>
              {breachedEntries.length > 0
                ? `⚠️ ${breachedEntries.length} 個密碼已洩漏`
                : '✅ ' + t('password', 'breachNotFound')}
            </p>
          )}
          {breachError && <p className="error-msg" style={{ textAlign: 'center', marginTop: 6 }}>{breachError}</p>}
        </div>

        {analysis.duplicates.length === 0 && analysis.weak.length === 0 && analysis.expiring.length === 0 && breachedEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-success)' }}>
            <ShieldCheck size={36} />
            <p style={{ marginTop: 8 }}>{t('password', 'allGood')}</p>
          </div>
        )}

        {/* F-02: Breached section */}
        {breachedEntries.length > 0 && (
          <HealthSection title={`🚨 ${t('password', 'breached')} (${breachedEntries.length})`} color="#dc2626">
            {breachedEntries.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username}
                extra={`${breachMap?.get(d.id)?.toLocaleString()} ${t('password', 'breachCount')}`}
                onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {analysis.duplicates.length > 0 && (
          <HealthSection title={`⚠️ ${t('password', 'duplicates')} (${analysis.duplicates.length})`} color="#ef4444">
            {analysis.duplicates.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username} onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {analysis.weak.length > 0 && (
          <HealthSection title={`🔓 ${t('password', 'weak_passwords')} (${analysis.weak.length})`} color="#f59e0b">
            {analysis.weak.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username} onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {analysis.expiring.length > 0 && (
          <HealthSection title={`⏰ ${t('password', 'expiring')} (${analysis.expiring.length})`} color="#8b5cf6">
            {analysis.expiring.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username}
                extra={d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : ''}
                onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {/* HIBP attribution */}
        <p style={{ fontSize: 10, color: 'var(--color-text-3)', textAlign: 'center', marginTop: 16 }}>
          洩漏檢查由 <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>HaveIBeenPwned</a> 提供 · k-anonymity，密碼唔會離開裝置
        </p>
      </div>
    </div>
  )
}

function HealthSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 8 }}>{title}</p>
      <div style={{ background: 'var(--color-card)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        {children}
      </div>
    </div>
  )
}

function HealthRow({ site, username, extra, onCopy }: { site: string; username: string; extra?: string; onCopy: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--color-border)', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{username}{extra ? ` · ${extra}` : ''}</p>
      </div>
      <button className="icon-btn" onClick={onCopy}><Copy size={14} /></button>
    </div>
  )
}
