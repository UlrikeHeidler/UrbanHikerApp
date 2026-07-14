import { useState } from 'react'
import { formatDistance, formatDuration } from '../utils/formatters'
import './SavedRoutes.css'

/**
 * Collapsible list of saved routes. Each row shows route name, distance,
 * duration and a delete button. Clicking a row fires onLoad.
 *
 * @param {object}    props
 * @param {import('../services/storage').SavedRoute[]} props.routes   - Saved routes to display
 * @param {Function}  props.onLoad   - Called with a SavedRoute when the user selects one
 * @param {Function}  props.onDelete - Called with a route id when the user deletes one
 */
export default function SavedRoutes({ routes, onLoad, onDelete }) {
  const [open, setOpen] = useState(false)

  if (!routes.length) return null

  return (
    <div className="saved-routes">
      <button className="saved-routes-toggle" onClick={() => setOpen((o) => !o)}>
        <span>🗂 Saved routes ({routes.length})</span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="saved-list">
          {routes.map((r) => (
            <li key={r.id} className="saved-item">
              <button className="saved-load-btn" onClick={() => onLoad(r)}>
                <span className="saved-name">{r.name}</span>
                <span className="saved-meta">
                  {formatDistance(r.info.distance)} · {formatDuration(r.info.duration)}
                  {' '}· {r.mode === 'loop' ? '🔄' : '→'}
                </span>
              </button>
              <button
                className="saved-delete-btn"
                onClick={(e) => { e.stopPropagation(); onDelete(r.id) }}
                aria-label={`Delete ${r.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
