import { useState } from 'react'
import AddressSearch from './AddressSearch'
import ModeToggle from './ModeToggle'
import LoopControls from './LoopControls'
import RoutePreferences from './RoutePreferences'
import WaypointList from './WaypointList'
import RouteResultPanel from './RouteResultPanel'
import SavedRoutes from './SavedRoutes'
import ApiKeySettings from './ApiKeySettings'
import { fetchRoute, fetchLoopRoute } from '../services/routing'
import './Sidebar.css'

const DEFAULT_LOOP_METERS = 5000

/**
 * Sidebar panel — route configuration, routing controls, result display,
 * and saved routes. Delegates all external calls to the service layer.
 *
 * @param {object}   props - See App.jsx for full prop descriptions
 */
export default function Sidebar({
  mode, onModeChange,
  startPoint, endPoint, waypoints, onRemoveWaypoint,
  activePin, setActivePin, onSetPoint, onClear,
  preferences, onPreferencesChange,
  route, setRoute, routeInfo, setRouteInfo,
  elevationProfile, setElevationProfile,
  isLoading, setIsLoading, error, setError,
  savedRoutes, onSaveRoute, onLoadRoute, onDeleteRoute,
  poisEnabled, onTogglePoi, onLoadPois, poisLoading,
}) {
  const [loopMeters, setLoopMeters] = useState(DEFAULT_LOOP_METERS)
  const [loopSeed, setLoopSeed]     = useState(0)

  const canRoute = mode === 'loop'
    ? Boolean(startPoint) && loopMeters > 0
    : Boolean(startPoint) && Boolean(endPoint)

  async function handleGetRoute() {
    if (!canRoute) return
    setIsLoading(true)
    setError(null)
    try {
      const opts = { preferences }
      const result = mode === 'loop'
        ? await fetchLoopRoute(startPoint, loopMeters, loopSeed, opts)
        : await fetchRoute(startPoint, endPoint, { ...opts, waypoints })
      setRoute(result.coordinates)
      setRouteInfo(result.info)
      setElevationProfile(result.elevationProfile)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🥾</span>
        <h1 className="sidebar-title">Urban Hiker</h1>
      </div>

      <div className="sidebar-body">
        <ModeToggle mode={mode} onChange={onModeChange} />

        <section className="point-section">
          <div className="point-row">
            {mode === 'a-to-b' && (
              <button className={`pin-toggle ${activePin === 'start' ? 'active' : ''}`} onClick={() => setActivePin('start')}>
                <span className="pin-dot start-dot" /> Start
              </button>
            )}
            {mode === 'loop' && <span className="pin-label"><span className="pin-dot start-dot" /> Start / return</span>}
            <AddressSearch placeholder="Search start address…" onSelect={(ll) => { onSetPoint('start', ll); setActivePin('end') }} />
          </div>
          {startPoint && <div className="coord-label">{startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}</div>}
        </section>

        {mode === 'a-to-b' && (
          <>
            <section className="point-section">
              <div className="point-row">
                <button className={`pin-toggle ${activePin === 'end' ? 'active' : ''}`} onClick={() => setActivePin('end')}>
                  <span className="pin-dot end-dot" /> End
                </button>
                <AddressSearch placeholder="Search end address…" onSelect={(ll) => { onSetPoint('end', ll); setActivePin('start') }} />
              </div>
              {endPoint && <div className="coord-label">{endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}</div>}
            </section>

            <WaypointList
              waypoints={waypoints}
              isAdding={activePin === 'waypoint'}
              onStartAdd={() => setActivePin('waypoint')}
              onRemove={onRemoveWaypoint}
            />
          </>
        )}

        {mode === 'loop' && (
          <LoopControls distanceMeters={loopMeters} onDistanceChange={setLoopMeters} seed={loopSeed} onSeedChange={setLoopSeed} />
        )}

        <RoutePreferences preferences={preferences} onChange={onPreferencesChange} />

        <div className="action-row">
          <button className="btn btn-primary" onClick={handleGetRoute} disabled={!canRoute || isLoading}>
            {isLoading ? 'Routing…' : mode === 'loop' ? 'Generate Loop' : 'Get Walking Route'}
          </button>
          <button className="btn btn-ghost" onClick={onClear}>Clear</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {routeInfo && (
          <RouteResultPanel
            routeInfo={routeInfo}
            elevationProfile={elevationProfile}
            coordinates={route}
            onSaveRoute={onSaveRoute}
            poisEnabled={poisEnabled}
            onTogglePoi={onTogglePoi}
            onLoadPois={onLoadPois}
            poisLoading={poisLoading}
          />
        )}

        <ApiKeySettings />
        <SavedRoutes routes={savedRoutes} onLoad={onLoadRoute} onDelete={onDeleteRoute} />
      </div>

      <div className="sidebar-footer">
        Map data © <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>
        {' '}· Routing © <a href="https://openrouteservice.org" target="_blank" rel="noreferrer">ORS</a>
      </div>
    </aside>
  )
}
