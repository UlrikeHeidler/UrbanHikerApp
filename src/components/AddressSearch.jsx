import { useState, useRef, useEffect } from 'react'
import { searchAddress } from '../services/geocoding'
import './AddressSearch.css'

export default function AddressSearch({ placeholder, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (val.length < 3) {
      setResults([])
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const hits = await searchAddress(val)
        setResults(hits)
        setIsOpen(hits.length > 0)
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  function handleSelect(result) {
    setQuery(result.display_name)
    setIsOpen(false)
    setResults([])
    onSelect({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) })
  }

  return (
    <div className="address-search" ref={wrapperRef}>
      <input
        className="address-input"
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isSearching && <div className="search-spinner" />}
      {isOpen && (
        <ul className="address-dropdown">
          {results.map((r) => (
            <li key={r.place_id} onClick={() => handleSelect(r)}>
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
