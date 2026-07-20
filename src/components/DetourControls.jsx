import { useState } from 'react'
import { minutesToMeters } from '../utils/formatters'
import './DetourControls.css'

/**
 * Optional distance/duration target for A-to-B routes.
 * When enabled, a detour waypoint is computed so the walking route
 * approximates the requested length rather than taking the shortest path.
 *
 * @param {object}   props
 * @param {number}   props.detourMeters   - Current target in metres (0 = disabled)
 * @param {Function} props.onMetersChange - Called with new target in metres
 * @param {boolean}  props.flip           - Whether the detour is flipped to the other side
 * @param {Function} props.onFlipChange   - Called with new flip boolean
 * @param {number}   [props.walkingSpeedKmh] - Walking pace for duration → distance (km/h)
 */
export default function DetourControls({ detourMeters, onMetersChange, flip, onFlipChange, walkingSpeedKmh }) {
  const [enabled, setEnabled]     = useState(false)
  const [inputMode, setInputMode] = useState('distance')
  const [kmValue, setKmValue]     = useState('')
  const [minValue, setMinValue]   = useState('')

  function handleToggle(e) {
    const on = e.target.checked
    setEnabled(on)
    if (!on) onMetersChange(0)
    else recompute(inputMode, kmValue, minValue)
  }

  function handleModeChange(mode) {
    setInputMode(mode)
    recompute(mode, kmValue, minValue)
  }

  function handleKmChange(e) {
    setKmValue(e.target.value)
    recompute('distance', e.target.value, minValue)
  }

  function handleMinChange(e) {
    setMinValue(e.target.value)
    recompute('duration', kmValue, e.target.value)
  }

  function recompute(mode, km, min) {
    if (mode === 'distance') {
      onMetersChange(Math.round(parseFloat(km || 0) * 1000))
    } else {
      onMetersChange(minutesToMeters(parseFloat(min || 0), walkingSpeedKmh))
    }
  }

  return (
    <div className="detour-controls">
      <label className="detour-header">
        <input
          type="checkbox"
          className="detour-checkbox"
          checked={enabled}
          onChange={handleToggle}
        />
        <span className="detour-title">Walk distance target</span>
        <span className="detour-hint"> (optional)</span>
      </label>

      {enabled && (
        <div className="detour-body">
          <div className="loop-input-toggle">
            <button
              className={`loop-tab ${inputMode === 'distance' ? 'active' : ''}`}
              onClick={() => handleModeChange('distance')}
            >Distance</button>
            <button
              className={`loop-tab ${inputMode === 'duration' ? 'active' : ''}`}
              onClick={() => handleModeChange('duration')}
            >Duration</button>
          </div>

          <div className="detour-row">
            {inputMode === 'distance' ? (
              <>
                <input
                  type="number" className="loop-input" min="0.5" max="50" step="0.5"
                  placeholder="e.g. 5"
                  value={kmValue}
                  onChange={handleKmChange}
                />
                <span className="loop-unit">km</span>
              </>
            ) : (
              <>
                <input
                  type="number" className="loop-input" min="5" max="300" step="5"
                  placeholder="e.g. 60"
                  value={minValue}
                  onChange={handleMinChange}
                />
                <span className="loop-unit">min</span>
              </>
            )}

            {detourMeters > 0 && (
              <button
                className={`detour-flip ${flip ? 'active' : ''}`}
                onClick={() => onFlipChange(!flip)}
                title="Flip detour direction"
              >
                ↔ Flip
              </button>
            )}
          </div>

          <p className="detour-note">
            Adds a detour so your walk is roughly this long.
            Use Flip if the route bows in an unwanted direction.
          </p>
        </div>
      )}
    </div>
  )
}
