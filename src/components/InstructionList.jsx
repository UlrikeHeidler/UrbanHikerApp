import { useState } from 'react'
import { formatDistance, formatDuration } from '../utils/formatters'
import './InstructionList.css'

/** ORS step type → arrow glyph */
const STEP_ICON = {
  0:  '←',   // left
  1:  '→',   // right
  2:  '↩',   // sharp left
  3:  '↪',   // sharp right
  4:  '↖',   // slight left
  5:  '↗',   // slight right
  6:  '↑',   // straight
  7:  '↻',   // enter roundabout
  8:  '↻',   // exit roundabout
  9:  '↩',   // u-turn
  10: '⚑',   // arrive
  11: '▶',   // depart
  12: '↖',   // keep left
  13: '↗',   // keep right
}

/**
 * Collapsible turn-by-turn instruction list for a routed trip.
 *
 * @param {object}   props
 * @param {import('../services/routing').RouteStep[]} props.steps
 */
export default function InstructionList({ steps }) {
  const [open, setOpen] = useState(false)

  if (!steps?.length) return null

  return (
    <div className="instruction-list">
      <button className="instruction-list__toggle" onClick={() => setOpen((v) => !v)}>
        <span>{open ? '▾' : '▸'} Turn-by-turn</span>
        <span className="instruction-list__count">{steps.length} steps</span>
      </button>

      {open && (
        <ol className="instruction-list__steps">
          {steps.map((step, i) => (
            <li key={i} className="instruction-list__step">
              <span className="instruction-list__icon" aria-hidden="true">
                {STEP_ICON[step.type] ?? '→'}
              </span>
              <span className="instruction-list__text">{step.instruction}</span>
              <span className="instruction-list__meta">
                {formatDistance(step.distanceM)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
