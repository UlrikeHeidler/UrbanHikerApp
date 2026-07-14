import { useState } from 'react'
import './SaveRouteForm.css'

/**
 * Inline form for naming and saving the current route.
 * Shown after a route has been successfully generated.
 *
 * @param {object}   props
 * @param {Function} props.onSave   - Called with the user's chosen name (string)
 * @param {boolean}  props.isSaved  - True once the route has been saved; shows confirmation
 */
export default function SaveRouteForm({ onSave, isSaved }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    setName('')
  }

  if (isSaved) {
    return <div className="save-confirmation">✓ Route saved</div>
  }

  return (
    <form className="save-route-form" onSubmit={handleSubmit}>
      <input
        className="save-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this route…"
        maxLength={80}
        aria-label="Route name"
      />
      <button className="save-btn" type="submit" disabled={!name.trim()}>
        Save
      </button>
    </form>
  )
}
