import './ModeToggle.css'

/** @typedef {'a-to-b' | 'loop'} RouteMode */

/**
 * Toggle between A-to-B routing mode and loop (round-trip) mode.
 *
 * @param {object}    props
 * @param {RouteMode} props.mode     - Currently active mode
 * @param {Function}  props.onChange - Called with the new RouteMode on change
 */
export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle" role="group" aria-label="Route mode">
      <button
        className={`mode-btn ${mode === 'a-to-b' ? 'active' : ''}`}
        onClick={() => onChange('a-to-b')}
        aria-pressed={mode === 'a-to-b'}
      >
        A → B
      </button>
      <button
        className={`mode-btn ${mode === 'loop' ? 'active' : ''}`}
        onClick={() => onChange('loop')}
        aria-pressed={mode === 'loop'}
      >
        🔄 Loop
      </button>
    </div>
  )
}
