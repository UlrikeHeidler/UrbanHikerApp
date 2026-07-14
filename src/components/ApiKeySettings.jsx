import { useState } from 'react'
import { setApiKey, clearApiKey, hasApiKey } from '../services/apiKey'
import './ApiKeySettings.css'

/**
 * Collapsible settings panel for the user's OpenRouteService API key.
 * The key is persisted to localStorage and read by the routing service at
 * call time — it is never embedded in the build bundle.
 *
 * @param {object}   props
 * @param {Function} props.onKeyChange - Called (with no args) after the key is saved or cleared
 */
export default function ApiKeySettings({ onKeyChange }) {
  const [open, setOpen]         = useState(!hasApiKey())
  const [value, setValue]       = useState('')
  const [visible, setVisible]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState(null)
  const configured = hasApiKey()

  function handleSave() {
    setError(null)
    try {
      setApiKey(value)
      setValue('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onKeyChange?.()
    } catch (e) {
      setError(e.message)
    }
  }

  function handleClear() {
    clearApiKey()
    setValue('')
    setError(null)
    onKeyChange?.()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <div className="apikey-settings">
      <button className="apikey-toggle" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className={`apikey-dot ${configured ? 'ok' : 'warn'}`} />
          API Key{configured ? ' (configured)' : ' (required)'}
        </span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="apikey-body">
          {!configured && (
            <p className="apikey-hint">
              Routing requires a free{' '}
              <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noreferrer">
                OpenRouteService
              </a>{' '}
              API key (2 000 req/day, no credit card).
            </p>
          )}

          <div className="apikey-input-row">
            <input
              className="apikey-input"
              type={visible ? 'text' : 'password'}
              placeholder="Paste your ORS API key…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="apikey-eye"
              onClick={() => setVisible((v) => !v)}
              title={visible ? 'Hide key' : 'Show key'}
            >
              {visible ? '🙈' : '👁'}
            </button>
          </div>

          {error && <p className="apikey-error">{error}</p>}

          <div className="apikey-actions">
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!value.trim()}>
              {saved ? '✓ Saved' : 'Save key'}
            </button>
            {configured && (
              <button className="btn btn-ghost btn-sm" onClick={handleClear}>
                Clear key
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
