import { useState } from 'react'
import { minutesToMeters } from '../utils/formatters'
import './LoopControls.css'

/** @typedef {'distance' | 'duration'} LoopInputMode */

/**
 * Controls for configuring a loop route: either a target distance (km)
 * or a target walk duration (minutes). The two inputs are mutually exclusive —
 * changing one clears the other.
 *
 * @param {object}   props
 * @param {number}   props.distanceMeters  - Controlled distance value in metres
 * @param {Function} props.onDistanceChange - Called with new distance in metres
 * @param {number}   props.seed             - Current route variation seed (0–90)
 * @param {Function} props.onSeedChange     - Called with new seed value
 */
export default function LoopControls({ distanceMeters, onDistanceChange, seed, onSeedChange }) {
  const [inputMode, setInputMode] = useState(/** @type {LoopInputMode} */ ('distance'))
  const [kmValue, setKmValue] = useState('5')
  const [minValue, setMinValue] = useState('60')

  /** Switch between distance-based and duration-based input. */
  function handleModeChange(newMode) {
    setInputMode(newMode)
    if (newMode === 'distance') {
      const meters = Math.round(parseFloat(kmValue || 0) * 1000)
      onDistanceChange(meters)
    } else {
      onDistanceChange(minutesToMeters(parseFloat(minValue || 0)))
    }
  }

  function handleKmChange(e) {
    setKmValue(e.target.value)
    const meters = Math.round(parseFloat(e.target.value || 0) * 1000)
    onDistanceChange(meters)
  }

  function handleMinChange(e) {
    setMinValue(e.target.value)
    onDistanceChange(minutesToMeters(parseFloat(e.target.value || 0)))
  }

  return (
    <div className="loop-controls">
      <div className="loop-input-toggle">
        <button
          className={`loop-tab ${inputMode === 'distance' ? 'active' : ''}`}
          onClick={() => handleModeChange('distance')}
        >
          Distance
        </button>
        <button
          className={`loop-tab ${inputMode === 'duration' ? 'active' : ''}`}
          onClick={() => handleModeChange('duration')}
        >
          Duration
        </button>
      </div>

      {inputMode === 'distance' ? (
        <div className="loop-field">
          <label className="loop-label" htmlFor="loop-km">Target distance</label>
          <div className="loop-input-row">
            <input
              id="loop-km"
              type="number"
              className="loop-input"
              min="0.5"
              max="50"
              step="0.5"
              value={kmValue}
              onChange={handleKmChange}
            />
            <span className="loop-unit">km</span>
          </div>
        </div>
      ) : (
        <div className="loop-field">
          <label className="loop-label" htmlFor="loop-min">Target duration</label>
          <div className="loop-input-row">
            <input
              id="loop-min"
              type="number"
              className="loop-input"
              min="5"
              max="300"
              step="5"
              value={minValue}
              onChange={handleMinChange}
            />
            <span className="loop-unit">min</span>
          </div>
        </div>
      )}

      <div className="loop-field">
        <label className="loop-label" htmlFor="loop-seed">
          Route variation
          <span className="loop-hint"> (change to get a different loop)</span>
        </label>
        <input
          id="loop-seed"
          type="range"
          className="loop-slider"
          min="0"
          max="9"
          step="1"
          value={seed}
          onChange={(e) => onSeedChange(parseInt(e.target.value, 10))}
        />
        <div className="loop-seed-value">{seed + 1} / 10</div>
      </div>
    </div>
  )
}
