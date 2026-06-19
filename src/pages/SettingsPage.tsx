import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const { t, settings, setLanguage, setClaudeApiKey, setLockTimeout } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(settings.claudeApiKey || '')

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
        <h1>{t('settings', 'title')}</h1>
        <div style={{ width: 36 }} />
      </header>

      <div className="settings-list">

        {/* Language */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'language')}</p>
          <div className="lang-toggle">
            <button
              className={settings.language === 'zh' ? 'active' : ''}
              onClick={() => setLanguage('zh')}
            >
              中文
            </button>
            <button
              className={settings.language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
          </div>
        </div>

        {/* Claude API Key */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'claudeApiKey')}</p>
          <p className="settings-hint">{t('settings', 'claudeApiKeyHint')}</p>
          <div className="api-key-row">
            <input
              type={showApiKey ? 'text' : 'password'}
              className="input"
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={() => setClaudeApiKey(apiKeyInput)}
            />
            <button className="icon-btn" onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Password lock timeout */}
        <div className="settings-section">
          <p className="settings-label">{t('settings', 'lockTimeout')}</p>
          <div className="timeout-options">
            {[1, 5, 10, 30].map((mins) => (
              <button
                key={mins}
                className={`timeout-btn ${settings.passwordLockTimeout === mins ? 'active' : ''}`}
                onClick={() => setLockTimeout(mins)}
              >
                {mins}
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="settings-section">
          <button className="btn-danger" onClick={signOut}>
            {t('auth', 'signOut')}
          </button>
        </div>

      </div>
    </div>
  )
}
