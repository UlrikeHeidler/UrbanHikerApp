import { useState, useEffect } from 'react'
import { getCallLog, clearCallLog, DAILY_LIMITS, ENDPOINT_COLORS, ENDPOINT_LABELS } from '../services/apiTracker'
import './ApiUsageModal.css'

const ENDPOINTS = /** @type {import('../services/apiTracker').ApiEndpoint[]} */ (['ors', 'nominatim', 'overpass'])

/**
 * Build per-day buckets for the last N days (today = index N-1).
 *
 * @param {import('../services/apiTracker').CallRecord[]} log
 * @param {number} days
 * @returns {{ label: string, ors: number, nominatim: number, overpass: number }[]}
 */
function buildDailyBuckets(log, days) {
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    d.setHours(0, 0, 0, 0)
    return {
      ts: d.getTime(),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      ors: 0, nominatim: 0, overpass: 0,
    }
  })
  for (const r of log) {
    const day = new Date(r.ts)
    day.setHours(0, 0, 0, 0)
    const ts = day.getTime()
    const bucket = buckets.find((b) => b.ts === ts)
    if (bucket && r.endpoint in bucket) bucket[r.endpoint]++
  }
  return buckets
}

/**
 * Minimal SVG bar chart — stacked bars (ORS / Nominatim / Overpass) per day,
 * with dashed threshold lines for each endpoint's daily limit.
 *
 * @param {{ buckets: ReturnType<typeof buildDailyBuckets> }} props
 */
function DailyChart({ buckets }) {
  const W = 280, H = 130
  const PAD = { top: 18, right: 10, bottom: 28, left: 38 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const barW = Math.floor(cw / buckets.length) - 3

  const dailyMaxCounts = buckets.map((b) =>
    ENDPOINTS.reduce((s, ep) => s + b[ep], 0)
  )
  const dataMax = Math.max(...dailyMaxCounts, 10)
  // Y-max: round up to nice number, include a reference line at lowest relevant limit
  const minLimit = Math.min(...ENDPOINTS.map((ep) => DAILY_LIMITS[ep]))
  const yMax = dataMax > minLimit * 0.5 ? Math.max(dataMax, minLimit) : dataMax
  const scale = (v) => ch - (v / yMax) * ch

  // Y-axis tick labels
  const ticks = [0, Math.round(yMax / 2), yMax]

  return (
    <svg width={W} height={H} className="usage-chart" role="img" aria-label="Daily API calls">
      {/* Y-axis ticks */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left} x2={PAD.left + cw}
            y1={PAD.top + scale(t)} y2={PAD.top + scale(t)}
            stroke="#e5e7eb" strokeWidth="1"
          />
          <text x={PAD.left - 4} y={PAD.top + scale(t) + 4}
            textAnchor="end" fontSize="9" fill="#9ca3af">
            {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
          </text>
        </g>
      ))}

      {/* Threshold lines — only draw when data approaches or exceeds limit */}
      {ENDPOINTS.map((ep) => {
        const limit = DAILY_LIMITS[ep]
        if (limit > yMax * 1.1) return null  // off-chart, skip
        return (
          <line key={ep}
            x1={PAD.left} x2={PAD.left + cw}
            y1={PAD.top + scale(limit)} y2={PAD.top + scale(limit)}
            stroke={ENDPOINT_COLORS[ep]} strokeWidth="1"
            strokeDasharray="4 3" opacity="0.7"
          />
        )
      })}

      {/* Stacked bars */}
      {buckets.map((b, i) => {
        const x = PAD.left + i * (cw / buckets.length) + 1
        let yOffset = 0
        return (
          <g key={i}>
            {ENDPOINTS.map((ep) => {
              const count = b[ep]
              if (!count) { return null }
              const barH = (count / yMax) * ch
              const y = PAD.top + ch - yOffset - barH
              yOffset += barH
              return (
                <rect key={ep} x={x} y={y} width={barW} height={barH}
                  fill={ENDPOINT_COLORS[ep]} opacity="0.85" rx="1">
                  <title>{ENDPOINT_LABELS[ep]}: {count}</title>
                </rect>
              )
            })}
            {/* Day label */}
            <text x={x + barW / 2} y={H - 4}
              textAnchor="middle" fontSize="9" fill="#6b7280">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Horizontal progress bar showing today's usage against the daily limit.
 *
 * @param {{ endpoint: import('../services/apiTracker').ApiEndpoint, count: number, total: number }} props
 */
function LimitBar({ endpoint, count, total }) {
  const limit   = DAILY_LIMITS[endpoint]
  const pct     = Math.min((count / limit) * 100, 100)
  const warn    = pct >= 80
  const color   = warn ? '#dc2626' : ENDPOINT_COLORS[endpoint]

  return (
    <div className="limit-row">
      <span className="limit-label">{ENDPOINT_LABELS[endpoint]}</span>
      <div className="limit-track">
        <div className="limit-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="limit-text" style={{ color: warn ? '#dc2626' : undefined }}>
        {count} / {limit.toLocaleString()}
        {warn && <span className="limit-warn"> !</span>}
      </span>
      <span className="limit-total-hint">({total} total / 7d)</span>
    </div>
  )
}

/**
 * Modal dialog showing API call statistics for the last 7 days.
 * Triggered by the 📊 button in the sidebar.
 *
 * @param {{ onClose: Function }} props
 */
export default function ApiUsageModal({ onClose }) {
  const [log, setLog]         = useState(() => getCallLog())
  const [confirmClear, setConfirmClear] = useState(false)

  // Refresh log whenever the modal is opened (log may have grown since mount)
  useEffect(() => { setLog(getCallLog()) }, [])

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return }
    clearCallLog()
    setLog([])
    setConfirmClear(false)
  }

  const buckets = buildDailyBuckets(log, 7)
  const today   = buckets[buckets.length - 1]

  // Per-endpoint totals (7-day)
  const totals = Object.fromEntries(
    ENDPOINTS.map((ep) => [ep, log.filter((r) => r.endpoint === ep).length])
  )
  const successes = log.filter((r) => r.success).length
  const successPct = log.length ? Math.round((successes / log.length) * 100) : 100

  return (
    <div className="usage-overlay" role="dialog" aria-modal="true" aria-label="API usage statistics"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="usage-modal">

        <div className="usage-header">
          <span className="usage-title">📊 API Usage — last 7 days</span>
          <div className="usage-header-actions">
            <button
              className={`usage-clear-btn ${confirmClear ? 'confirming' : ''}`}
              onClick={handleClear}
              title="Clear all tracking data"
            >
              {confirmClear ? 'Confirm clear?' : 'Clear data'}
            </button>
            {confirmClear && (
              <button className="usage-cancel-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
            )}
            <button className="usage-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {log.length === 0 ? (
          <p className="usage-empty">No calls recorded yet. Tracking starts as soon as you generate a route or search an address.</p>
        ) : (
          <>
            {/* Summary stats */}
            <div className="usage-stats-row">
              <div className="usage-stat">
                <span className="usage-stat-val">{log.length}</span>
                <span className="usage-stat-lbl">Total (7d)</span>
              </div>
              <div className="usage-stat">
                <span className="usage-stat-val">{ENDPOINTS.reduce((s, ep) => s + today[ep], 0)}</span>
                <span className="usage-stat-lbl">Today</span>
              </div>
              <div className="usage-stat">
                <span className={`usage-stat-val ${successPct < 90 ? 'usage-stat-warn' : ''}`}>{successPct}%</span>
                <span className="usage-stat-lbl">Success rate</span>
              </div>
            </div>

            {/* Daily bar chart */}
            <p className="usage-section-label">Daily calls</p>
            <DailyChart buckets={buckets} />

            {/* Chart legend */}
            <div className="usage-legend">
              {ENDPOINTS.map((ep) => (
                <span key={ep} className="usage-legend-item">
                  <span className="usage-legend-dot" style={{ background: ENDPOINT_COLORS[ep] }} />
                  {ep.toUpperCase()}
                </span>
              ))}
              <span className="usage-legend-item usage-legend-dashed">-- limit</span>
            </div>

            {/* Today vs daily limits */}
            <p className="usage-section-label">Today vs daily limit</p>
            {ENDPOINTS.map((ep) => (
              <LimitBar key={ep} endpoint={ep} count={today[ep]} total={totals[ep]} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
