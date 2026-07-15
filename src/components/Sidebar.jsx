import { useState } from 'react'
import AddressSearch from './AddressSearch'
import ModeToggle from './ModeToggle'
import LoopControls from './LoopControls'
import RoutePreferences from './RoutePreferences'
import WaypointList from './WaypointList'
import RouteResultPanel from './RouteResultPanel'
import RouteAlternatives from './RouteAlternatives'
import DetourControls from './DetourControls'
import SavedRoutes from './SavedRoutes'
import AppSettings from './AppSettings'
import { fetchRoute, fetchLoopRoute, fetchSubRoute } from '../services/routing'
import { minutesToMeters } from '../utils/formatters'
import { findMainRoadSegments, spliceSubRoute } from '../utils/routeRefine'
import { haversineDistance } from '../utils/geo'
import { computeDetourWaypoint } from '../utils/detour'
import { getAppDefaults } from '../services/settings'
import './Sidebar.css'

const _appDefaults = getAppDefaults()

/**
 * Sidebar panel — route configuration, routing controls, result display,
 * and saved routes. Delegates all external calls to the service layer.
 *
 * @param {object}   props - See App.jsx for full prop descriptions
 */
export default function Sidebar({
  mode, onModeChange,
  startPoint, endPoint, startLabel, endLabel, waypoints, onRemoveWaypoint,
  activePin, setActivePin, onSetPoint, onClear,
  preferences, onPreferencesChange,
  route, setRoute, routeWayTypes, setRouteWayTypes, routeInfo, setRouteInfo,
  elevationProfile, setElevationProfile,
  routeAlternatives, setRouteAlternatives,
  selectedRouteIndex, setSelectedRouteIndex, onSelectRoute,
  setDetourWaypoint,
  isLoading, setIsLoading, error, setError,
  savedRoutes, onSaveRoute, onLoadRoute, onDeleteRoute,
  onDefaultStartChange,
  onRouteClick,
  poisEnabled, onTogglePoi, onLoadPois, poisLoading,
}) {
  const [loopMeters, setLoopMeters]     = useState(
    _appDefaults.defaultLoopInputMode === 'duration'
      ? minutesToMeters(_appDefaults.defaultLoopMinutes)
      : _appDefaults.defaultLoopKm * 1000
  )
  const [loopSeed, setLoopSeed]         = useState(0)
  const [detourMeters, setDetourMeters] = useState(0)
  const [detourFlip, setDetourFlip]     = useState(false)
  const [refinedCount, setRefinedCount] = useState(0)

  const canRoute = mode === 'loop'
    ? Boolean(startPoint) && loopMeters > 0
    : Boolean(startPoint) && Boolean(endPoint)

  async function refineRouteResult(coords, wayTypes) {
    const refineMinM = _appDefaults.defaultRefineMinFeet * 0.3048
    const segments = findMainRoadSegments(coords, wayTypes, refineMinM)
    if (!segments.length) return { coords, wayTypes, refined: 0 }
    let currentCoords = coords
    let currentWayTypes = wayTypes
    let refined = 0
    // Process segments back-to-front so earlier splices don't shift later indices
    for (const seg of [...segments].reverse()) {
      const segStart = { lat: currentCoords[seg.startIdx][0], lng: currentCoords[seg.startIdx][1] }
      const segEnd   = { lat: currentCoords[seg.endIdx][0],   lng: currentCoords[seg.endIdx][1] }
      try {
        const sub = await fetchSubRoute(segStart, segEnd)
        currentCoords = spliceSubRoute(currentCoords, seg.startIdx, seg.endIdx, sub.coordinates)
        currentWayTypes = [
          ...currentWayTypes.slice(0, seg.startIdx),
          ...sub.wayTypes,
          ...currentWayTypes.slice(seg.endIdx + 1),
        ]
        refined++
      } catch {
        // No alternative for this segment — keep it as-is
      }
    }
    return { coords: currentCoords, wayTypes: currentWayTypes, refined }
  }

  async function handleGetRoute() {
    if (!canRoute) return
    setIsLoading(true)
    setError(null)
    setRefinedCount(0)
    try {
      const opts = { preferences }
      if (mode === 'loop') {
        const result = await fetchLoopRoute(startPoint, loopMeters, loopSeed, opts)
        setRouteAlternatives([])
        setSelectedRouteIndex(0)
        let coords = result.coordinates
        let wayTypes = result.wayTypes ?? []
        if (preferences.refineRoute) {
          const refined = await refineRouteResult(coords, wayTypes)
          coords = refined.coords
          wayTypes = refined.wayTypes
          setRefinedCount(refined.refined)
        }
        setRoute(coords)
        setRouteWayTypes(wayTypes)
        setRouteInfo(result.info)
        setElevationProfile(result.elevationProfile)
      } else {
        const detourWp = computeDetourWaypoint(startPoint, endPoint, detourMeters, detourFlip)
        setDetourWaypoint(detourWp)
        const allWaypoints = detourWp ? [detourWp, ...waypoints] : waypoints
        const results = await fetchRoute(startPoint, endPoint, { ...opts, waypoints: allWaypoints })
        setRouteAlternatives(results)
        setSelectedRouteIndex(0)
        let coords = results[0].coordinates
        let wayTypes = results[0].wayTypes ?? []
        if (preferences.refineRoute) {
          const refined = await refineRouteResult(coords, wayTypes)
          coords = refined.coords
          wayTypes = refined.wayTypes
          setRefinedCount(refined.refined)
          // Recalculate distance after splicing
          if (refined.refined > 0) {
            const newDist = coords.reduce((sum, c, i) =>
              i === 0 ? 0 : sum + haversineDistance(coords[i - 1], c), 0)
            results[0] = { ...results[0], coordinates: coords, info: { ...results[0].info, distance: newDist } }
          }
        }
        setRoute(coords)
        setRouteWayTypes(wayTypes)
        setRouteInfo(results[0].info)
        setElevationProfile(results[0].elevationProfile)
      }
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
          {startPoint && (
            <div className="coord-label">
              {startLabel ?? `${startPoint.lat.toFixed(5)}, ${startPoint.lng.toFixed(5)}`}
            </div>
          )}
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
              {endPoint && (
                <div className="coord-label">
                  {endLabel ?? `${endPoint.lat.toFixed(5)}, ${endPoint.lng.toFixed(5)}`}
                </div>
              )}
            </section>

            <WaypointList
              waypoints={waypoints}
              isAdding={activePin === 'waypoint'}
              onStartAdd={() => setActivePin('waypoint')}
              onRemove={onRemoveWaypoint}
            />

            <DetourControls
              detourMeters={detourMeters}
              onMetersChange={setDetourMeters}
              flip={detourFlip}
              onFlipChange={setDetourFlip}
            />
          </>
        )}

        {mode === 'loop' && (
          <LoopControls
            distanceMeters={loopMeters} onDistanceChange={setLoopMeters}
            seed={loopSeed} onSeedChange={setLoopSeed}
            initialKm={_appDefaults.defaultLoopKm}
            initialMinutes={_appDefaults.defaultLoopMinutes}
            initialInputMode={_appDefaults.defaultLoopInputMode}
          />
        )}

        <RoutePreferences preferences={preferences} onChange={onPreferencesChange} refineMinFeet={_appDefaults.defaultRefineMinFeet} />

        <div className="action-row">
          <button className="btn btn-primary" onClick={handleGetRoute} disabled={!canRoute || isLoading}>
            {isLoading ? 'Routing…' : mode === 'loop' ? 'Generate Loop' : 'Get Walking Route'}
          </button>
          <button className="btn btn-ghost" onClick={onClear}>Clear</button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {refinedCount > 0 && (
          <div className="refine-notice">
            Refined {refinedCount} main-road segment{refinedCount > 1 ? 's' : ''}.
            Click anywhere on the route to re-route that section.
          </div>
        )}
        {route && refinedCount === 0 && preferences.refineRoute && (
          <div className="refine-notice refine-notice--hint">
            No long main-road segments found. Click the route to manually re-route a section.
          </div>
        )}
        {route && !preferences.refineRoute && (
          <div className="refine-notice refine-notice--hint">
            Click the route to re-route any section away from main roads.
          </div>
        )}

        <RouteAlternatives
          alternatives={routeAlternatives}
          selectedIndex={selectedRouteIndex}
          onSelect={onSelectRoute}
        />

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

        <AppSettings
          currentStart={startPoint}
          currentStartLabel={startLabel}
          onDefaultStartChange={onDefaultStartChange}
        />
        <SavedRoutes routes={savedRoutes} onLoad={onLoadRoute} onDelete={onDeleteRoute} />
      </div>

      <div className="sidebar-footer">
        Map data © <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>
        {' '}· Routing © <a href="https://openrouteservice.org" target="_blank" rel="noreferrer">ORS</a>
      </div>
    </aside>
  )
}
