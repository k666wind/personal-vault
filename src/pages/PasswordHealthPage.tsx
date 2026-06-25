import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, ShieldAlert, Copy, Lock } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import { scorePassword } from '../lib/crypto'

export default function PasswordHealthPage() {
  const { t } = useAppStore()
  const navigate = useNavigate()
  // BUG-02 FIX: guard against locked state
  const { entries, decryptPassword, isLocked } = usePasswordStore()

  const analysis = useMemo(() => {
    // BUG-02 FIX: if vault is locked, return empty analysis instead of
    // decrypting with null key (which scores every password as 0 = "weak")
    if (isLocked) return { score: 0, duplicates: [], weak: [], expiring: [], decrypted: [] }

    const decrypted: Array<{ id: string; site: string; username: string; plain: string; strength: number; expiresAt?: number }> = []

    for (const e of entries) {
      const plain = decryptPassword(e.encryptedPassword) || ''
      decrypted.push({
        id: e.id,
        site: e.site,
        username: e.username,
        plain,
        strength: scorePassword(plain),
        expiresAt: e.expiresAt,
      })
    }

    // Duplicates: group by plaintext password
    const pwMap = new Map<string, string[]>()
    for (const d of decrypted) {
      if (!d.plain) continue
      const existing = pwMap.get(d.plain) || []
      existing.push(d.site)
      pwMap.set(d.plain, existing)
    }
    const duplicates = decrypted.filter((d) => (pwMap.get(d.plain)?.length || 0) > 1)

    // Weak: strength <= 1
    const weak = decrypted.filter((d) => d.strength <= 1)

    // Expiring soon: within 30 days or already expired
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const expiring = decrypted.filter((d) => d.expiresAt && d.expiresAt - now < thirtyDays)

    // Score: 100 - penalties
    const total = entries.length || 1
    const penalty =
      (duplicates.length / total) * 40 +
      (weak.length / total) * 40 +
      (expiring.length / total) * 20
    const score = Math.max(0, Math.round(100 - penalty))

    return { score, duplicates, weak, expiring, decrypted }
  // BUG-22 FIX: only re-run expensive decryption when encrypted values actually
  // change, not on every Firestore update (e.g. tag edits trigger listener but
  // don't change encryptedPassword). Stable key = sorted id:hash pairs.
  }, [entries.map((e) => e.id + ':' + e.encryptedPassword).sort().join('|'), isLocked])

  const scoreColor =
    analysis.score >= 80 ? 'var(--color-success)' :
    analysis.score >= 50 ? '#f59e0b' :
    'var(--color-error)'

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  // BUG-02 FIX: show lock screen if vault is locked
  if (isLocked) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => navigate('/passwords')}>
            <ChevronLeft size={22} />
          </button>
          <h1>{t('password', 'health')}</h1>
          <div style={{ width: 36 }} />
        </header>
        <div className="empty-page">
          <Lock size={48} style={{ color: 'var(--color-text-3)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-text-2)' }}>請先解鎖密碼庫</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/passwords')}>
            前往解鎖
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/passwords')}>
          <ChevronLeft size={22} />
        </button>
        <h1>{t('password', 'health')}</h1>
        <div style={{ width: 36 }} />
      </header>

      <div style={{ padding: '16px' }}>
        {/* Score ring */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            background: 'var(--color-card)', borderRadius: 16, padding: '24px 32px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
              {analysis.score}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>
              {t('password', 'healthScore')}
            </div>
            <div style={{ marginTop: 12 }}>
              {analysis.score >= 80
                ? <ShieldCheck size={28} style={{ color: 'var(--color-success)' }} />
                : <ShieldAlert size={28} style={{ color: scoreColor }} />}
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: t('password', 'duplicates'), count: analysis.duplicates.length, color: '#ef4444' },
            { label: t('password', 'weak_passwords'), count: analysis.weak.length, color: '#f59e0b' },
            { label: t('password', 'expiring'), count: analysis.expiring.length, color: '#8b5cf6' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{
              flex: '1 1 auto', background: 'var(--color-card)', borderRadius: 10,
              padding: '12px 14px', boxShadow: 'var(--shadow-card)',
              borderLeft: `3px solid ${count > 0 ? color : 'var(--color-success)'}`
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: count > 0 ? color : 'var(--color-success)' }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* No issues */}
        {analysis.duplicates.length === 0 && analysis.weak.length === 0 && analysis.expiring.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-success)' }}>
            <ShieldCheck size={36} />
            <p style={{ marginTop: 8 }}>{t('password', 'allGood')}</p>
          </div>
        )}

        {/* Duplicate section */}
        {analysis.duplicates.length > 0 && (
          <HealthSection title={`⚠️ ${t('password', 'duplicates')} (${analysis.duplicates.length})`} color="#ef4444">
            {analysis.duplicates.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username} onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {/* Weak section */}
        {analysis.weak.length > 0 && (
          <HealthSection title={`🔓 ${t('password', 'weak_passwords')} (${analysis.weak.length})`} color="#f59e0b">
            {analysis.weak.map((d) => (
              <HealthRow key={d.id} site={d.site} username={d.username} onCopy={() => handleCopy(d.plain)} />
            ))}
          </HealthSection>
        )}

        {/* Expiring section */}
        {analysis.expiring.length > 0 && (
          <HealthSection title={`⏰ ${t('password', 'expiring')} (${analysis.expiring.length})`} color="#8b5cf6">
            {analysis.expiring.map((d) => (
              <HealthRow
                key={d.id}
                site={d.site}
                username={d.username}
                extra={d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : ''}
                onCopy={() => handleCopy(d.plain)}
              />
            ))}
          </HealthSection>
        )}
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
    <div style={{
      display: 'flex', alignItems: 'center', padding: '10px 14px',
      borderBottom: '1px solid var(--color-border)', gap: 10
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{username}{extra ? ` · ${extra}` : ''}</p>
      </div>
      <button className="icon-btn" onClick={onCopy}><Copy size={14} /></button>
    </div>
  )
}
