import { useState } from 'react'
import { setApiKey, clearApiKey, hasApiKey } from '../services/apiKey'
import { getDefaultStart, setDefaultStart, clearDefaultStart, getAppDefaults, setAppDefaults, resetAppDefaults } from '../services/settings'
import { DEFAULT_PREFERENCES, DEFAULT_LOOP_KM, DEFAULT_LOOP_MINUTES, DEFAULT_LOOP_INPUT_MODE, DEFAULT_REFINE_MIN_FEET, DEFAULT_POI_ENABLED, DEFAULT_WALKING_SPEED_KMH } from '../config/defaults'
import AddressSearch from './AddressSearch'
import './AppSettings.css'

const POI_CONFIG = {
  bench:     { label: '🪑 Benches',    color: '#16a34a' },
  water:     { label: '💧 Water',      color: '#2563eb' },
  viewpoint: { label: '🔭 Viewpoints', color: '#9333ea' },
  bus_stop:  { label: '🚌 Bus Stops',  color: '#f97316' },
  tram_stop: { label: '🚃 Tram Stops', color: '#0d9488' },
  subway:    { label: '🚇 Metro',       color: '#7c3aed' },
}

/**
 * Combined collapsible settings panel — Default Start, API Key, and Route/POI Defaults.
 *
 * @param {object}   props
 * @param {{ lat: number, lng: number }|null} props.currentStart
 * @param {string|null} props.currentStartLabel
 * @param {Function} props.onDefaultStartChange - Called after save or clear of default start
 */
export default function AppSettings({ currentStart, currentStartLabel, onDefaultStartChange, onAppDefaultsChange }) {
  const [open, setOpen]         = useState(false)
  const [tab, setTab]           = useState('start')

  // ── Default Start ──
  const [dsStored, setDsStored] = useState(() => getDefaultStart())
  const [dsSaved, setDsSaved]   = useState(false)

  // ── API Key ──
  const [akValue, setAkValue]     = useState('')
  const [akVisible, setAkVisible] = useState(false)
  const [akSaved, setAkSaved]     = useState(false)
  const [akError, setAkError]     = useState(null)
  const [akConfigured, setAkConfigured] = useState(hasApiKey)

  // ── Defaults ──
  const [df, setDfState]  = useState(() => getAppDefaults())
  const [dfSaved, setDfSaved] = useState(false)

  function flash(setter) { setter(true); setTimeout(() => setter(false), 2500) }

  // Default Start handlers
  function dsHandleSaveCurrent() {
    if (!currentStart) return
    const entry = setDefaultStart(currentStart, currentStartLabel ?? null)
    setDsStored(entry); flash(setDsSaved); onDefaultStartChange?.(entry)
  }
  function dsHandleAddressSelect(latlng) {
    const entry = setDefaultStart(latlng, null)
    setDsStored(entry); flash(setDsSaved); onDefaultStartChange?.(entry)
  }
  function dsHandleClear() { clearDefaultStart(); setDsStored(null); onDefaultStartChange?.(null) }

  // API Key handlers
  function akHandleSave() {
    setAkError(null)
    try { setApiKey(akValue); setAkValue(''); setAkConfigured(true); flash(setAkSaved) }
    catch (e) { setAkError(e.message) }
  }
  function akHandleClear() { clearApiKey(); setAkValue(''); setAkConfigured(hasApiKey()); setAkError(null) }

  // Defaults handlers
  function setDf(key, value) { setDfState((prev) => ({ ...prev, [key]: value })) }
  function setDfPref(key, value) {
    setDfState((prev) => ({ ...prev, defaultPreferences: { ...prev.defaultPreferences, [key]: value } }))
  }
  function setDfPoi(type, value) {
    setDfState((prev) => ({ ...prev, defaultPoiEnabled: { ...prev.defaultPoiEnabled, [type]: value } }))
  }
  function dfHandleSave() {
    try { setAppDefaults(df); flash(setDfSaved); onAppDefaultsChange?.() } catch { /* validation error — ignore */ }
  }
  function dfHandleReset() { resetAppDefaults(); setDfState(getAppDefaults()) }

  const TABS = [
    { id: 'start',    label: 'Start' },
    { id: 'apikey',   label: 'API Key' },
    { id: 'defaults', label: 'Defaults' },
  ]

  return (
    <div className="appsettings">
      <button className="appsettings-toggle" onClick={() => setOpen((o) => !o)}>
        <span>
          {!akConfigured && <span className="appsettings-warn">(!)</span>}
          ⚙ Settings
        </span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="appsettings-body">
          <div className="appsettings-tabs">
            {TABS.map(({ id, label }) => (
              <button key={id} className={`appsettings-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'start' && (
            <div className="appsettings-section">
              {dsStored
                ? <p className="aset-text aset-text--em">{dsStored.label ?? `${dsStored.lat.toFixed(5)}, ${dsStored.lng.toFixed(5)}`}</p>
                : <p className="aset-text">Set a default start so the app pre-fills it on every visit.</p>}
              <AddressSearch placeholder="Search new default address…" onSelect={dsHandleAddressSelect} />
              {dsSaved && <p className="aset-saved">Saved!</p>}
              <div className="aset-actions">
                {currentStart && <button className="btn btn-primary btn-sm" onClick={dsHandleSaveCurrent}>Use current start</button>}
                {dsStored && <button className="btn btn-ghost btn-sm" onClick={dsHandleClear}>Clear default</button>}
              </div>
            </div>
          )}

          {tab === 'apikey' && (
            <div className="appsettings-section">
              {!akConfigured && (
                <p className="aset-text">Routing requires a free{' '}
                  <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noreferrer">OpenRouteService</a>
                  {' '}API key (2 000 req/day, no credit card).
                </p>
              )}
              <div className="aset-input-row">
                <input className="aset-input" type={akVisible ? 'text' : 'password'}
                  placeholder="Paste your ORS API key…" value={akValue}
                  onChange={(e) => setAkValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && akHandleSave()}
                  autoComplete="off" spellCheck={false} />
                <button className="aset-eye" onClick={() => setAkVisible((v) => !v)} title={akVisible ? 'Hide key' : 'Show key'}>
                  {akVisible ? '🙈' : '👁'}
                </button>
              </div>
              {akError && <p className="aset-error">{akError}</p>}
              <div className="aset-actions">
                <button className="btn btn-primary btn-sm" onClick={akHandleSave} disabled={!akValue.trim()}>
                  {akSaved ? '✓ Saved' : 'Save key'}
                </button>
                {akConfigured && <button className="btn btn-ghost btn-sm" onClick={akHandleClear}>Clear key</button>}
              </div>
            </div>
          )}

          {tab === 'defaults' && (
            <div className="appsettings-section">
              <div className="aset-row">
                <span className="aset-label">Route mode</span>
                <div className="aset-toggle-pair">
                  {['a-to-b', 'loop'].map((m) => (
                    <button key={m} className={`aset-tab ${df.defaultMode === m ? 'active' : ''}`}
                      onClick={() => setDf('defaultMode', m)}>
                      {m === 'a-to-b' ? 'A→B' : 'Loop'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="aset-row">
                <span className="aset-label">Loop input</span>
                <div className="aset-toggle-pair">
                  {['distance', 'duration'].map((m) => (
                    <button key={m} className={`aset-tab ${df.defaultLoopInputMode === m ? 'active' : ''}`}
                      onClick={() => setDf('defaultLoopInputMode', m)}>
                      {m === 'distance' ? 'Distance' : 'Duration'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-loop-km">Default loop distance</label>
                <div className="aset-num-row">
                  <input id="aset-loop-km" type="number" className="aset-num" min="0.5" max="200" step="0.5"
                    value={df.defaultLoopKm}
                    onChange={(e) => setDf('defaultLoopKm', parseFloat(e.target.value) || DEFAULT_LOOP_KM)} />
                  <span className="aset-unit">km</span>
                </div>
              </div>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-loop-min">Default loop duration</label>
                <div className="aset-num-row">
                  <input id="aset-loop-min" type="number" className="aset-num" min="5" max="600" step="5"
                    value={df.defaultLoopMinutes}
                    onChange={(e) => setDf('defaultLoopMinutes', parseFloat(e.target.value) || DEFAULT_LOOP_MINUTES)} />
                  <span className="aset-unit">min</span>
                </div>
              </div>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-green">Prefer green <span className="aset-pct">{Math.round(df.defaultPreferences.green * 100)}%</span></label>
                <input id="aset-green" type="range" className="aset-slider" min="0" max="0.8" step="0.1"
                  value={df.defaultPreferences.green} onChange={(e) => setDfPref('green', parseFloat(e.target.value))} />
              </div>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-quiet">Prefer quiet <span className="aset-pct">{Math.round(df.defaultPreferences.quiet * 100)}%</span></label>
                <input id="aset-quiet" type="range" className="aset-slider" min="0" max="0.8" step="0.1"
                  value={df.defaultPreferences.quiet} onChange={(e) => setDfPref('quiet', parseFloat(e.target.value))} />
              </div>
              <label className="aset-check-row">
                <input type="checkbox" checked={df.defaultPreferences.refineRoute}
                  onChange={(e) => setDfPref('refineRoute', e.target.checked)} />
                Auto-refine main roads
              </label>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-refine-ft">Refine threshold</label>
                <div className="aset-num-row">
                  <input id="aset-refine-ft" type="number" className="aset-num" min="50" max="2640" step="50"
                    value={df.defaultRefineMinFeet}
                    onChange={(e) => setDf('defaultRefineMinFeet', parseFloat(e.target.value) || DEFAULT_REFINE_MIN_FEET)} />
                  <span className="aset-unit">ft</span>
                </div>
              </div>
              <div className="aset-row">
                <label className="aset-label" htmlFor="aset-walk-speed">Walking pace</label>
                <div className="aset-num-row">
                  <input id="aset-walk-speed" type="number" className="aset-num" min="1" max="20" step="0.5"
                    value={df.walkingSpeedKmh}
                    onChange={(e) => setDf('walkingSpeedKmh', parseFloat(e.target.value) || DEFAULT_WALKING_SPEED_KMH)} />
                  <span className="aset-unit">km/h</span>
                </div>
              </div>
              <p className="aset-label aset-label--section">Default POI visibility</p>
              <div className="aset-poi-grid">
                {Object.entries(POI_CONFIG).map(([type, { label, color }]) => (
                  <label key={type} className="aset-check-row">
                    <input type="checkbox" checked={df.defaultPoiEnabled[type]}
                      onChange={(e) => setDfPoi(type, e.target.checked)} />
                    <span className="aset-poi-dot" style={{ background: color }} />
                    {label}
                  </label>
                ))}
              </div>
              {dfSaved && <p className="aset-saved">Saved!</p>}
              <div className="aset-actions">
                <button className="btn btn-primary btn-sm" onClick={dfHandleSave}>Save defaults</button>
                <button className="btn btn-ghost btn-sm" onClick={dfHandleReset}>Reset to base</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
