import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents, ScaleControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'
import { fetchStopRoutes } from '../services/overpass'
import { MAP_DEFAULT_CENTER } from '../config/defaults'
import TransitRoutesLayer from './TransitRoutesLayer'
import PoiLayer from './PoiLayer'
import LocateButton from './LocateButton'

// CVE note: Leaflet ≤1.9.4 has an XSS vector in bindPopup(htmlString). This file
// never calls bindPopup() directly — all popups use react-leaflet's <Popup> JSX
// component, which renders children via a React portal (DOM node, not HTML string).
// React escapes all string content, so external data (OSM names, route refs, etc.)
// is never treated as HTML. Do NOT introduce direct L.bindPopup(string) calls with
// untrusted content until an upstream patch is available.

// Fix Leaflet's default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const startIcon  = makeColorIcon('green')
const endIcon    = makeColorIcon('red')
const detourIcon = makeColorIcon('orange')

/**
 * Create a numbered Leaflet DivIcon for a waypoint pin.
 *
 * @param {number} n - 1-based waypoint number
 * @returns {L.DivIcon}
 */
function makeNumberedWaypointIcon(n) {
  return L.divIcon({
    html: `<div class="waypoint-pin-body"><span>${n}</span></div>`,
    className: 'waypoint-pin',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

/** @type {Record<string, { color: string, label: string }>} */
const POI_STYLE = {
  bench:     { color: '#16a34a', label: '🪑 Bench' },
  water:     { color: '#2563eb', label: '💧 Water' },
  viewpoint: { color: '#9333ea', label: '🔭 Viewpoint' },
  bus_stop:  { color: '#f97316', label: '🚌 Bus Stop' },
  tram_stop: { color: '#0d9488', label: '🚃 Tram Stop' },
  subway:    { color: '#7c3aed', label: '🚇 Metro' },
}

const TRANSIT_TYPES = new Set(['bus_stop', 'tram_stop', 'subway'])

/**
 * Popup for transit stops. Shows name, stop ref, and transit routes.
 * Routes are read from the OSM route_ref tag; if absent, fetched from
 * Overpass only when `open` becomes true — never on initial mount.
 *
 * @param {{ node: import('../services/overpass').PoiNode, label: string, open: boolean }} props
 */
function TransitPopup({ node, label, open }) {
  const [routes, setRoutes] = useState(() =>
    node.routeRef ? node.routeRef.split(';').map((r) => r.trim()).filter(Boolean) : null
  )
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!open) return        // do nothing until the user actually opens the popup
    if (routes !== null) return  // already have data (from routeRef tag or prior fetch)
    fetchStopRoutes(node.id)
      .then(setRoutes)
      .catch((err) => { setRoutes([]); setLoadError(err.message) })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span>
      <strong>{label}</strong>
      {node.name && <><br />{node.name}</>}
      {node.stopRef && <><br />Stop: {node.stopRef}</>}
      {routes === null && open && <><br /><em>Loading lines…</em></>}
      {routes?.length > 0 && <><br />Lines: {routes.join(', ')}</>}
      {loadError && <><br /><em style={{ color: '#b91c1c' }}>{loadError}</em></>}
    </span>
  )
}

/**
 * Create a Leaflet Icon using the pointhi color-marker CDN.
 *
 * @param {string} color - One of the supported marker colors
 * @returns {L.Icon}
 */
function makeColorIcon(color) {
  return new L.Icon({
    iconUrl: `${import.meta.env.BASE_URL}markers/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  })
}

/** Forwards map click events to the parent. */
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

/**
 * A single POI marker. Tracks whether its popup is open so TransitPopup
 * can defer the Overpass fetch until the user actually clicks the stop.
 *
 * @param {{ node: import('../services/overpass').PoiNode, type: string }} props
 */
function TransitMarker({ node, type }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const style = POI_STYLE[type]
  return (
    <CircleMarker
      center={[node.lat, node.lon]}
      radius={6}
      pathOptions={{ color: style?.color, fillColor: style?.color, fillOpacity: 0.8 }}
      eventHandlers={{
        popupopen:  () => setPopupOpen(true),
        popupclose: () => setPopupOpen(false),
      }}
    >
      <Popup>
        {TRANSIT_TYPES.has(type)
          ? <TransitPopup node={node} label={style?.label} open={popupOpen} />
          : `${style?.label}${node.name ? ` — ${node.name}` : ''}`}
      </Popup>
    </CircleMarker>
  )
}

/**
 * Full-screen interactive map. Displays start/end/waypoint markers, the route
 * polyline, POI overlay, and forwards click events to the parent.
 *
 * @param {object}   props
 * @param {object}   props.startPoint  - {lat, lng} or null
 * @param {object}   props.endPoint    - {lat, lng} or null
 * @param {Array}    props.route       - [lat, lng] pairs or null
 * @param {string}   props.mode        - 'a-to-b' | 'loop'
 * @param {string}   props.activePin   - 'start' | 'end' | 'waypoint'
 * @param {object[]} props.waypoints   - Array of {lat, lng}
 * @param {Array[]}  props.altRoutes      - Coordinates of non-selected alternative routes
 * @param {object}   props.detourWaypoint - Computed detour midpoint {lat,lng} or null
 * @param {object}   props.pois                  - { bench: PoiNode[], … }
 * @param {object}   props.poisEnabled            - { bench: boolean, … }
 * @param {number}   props.poiRequestId           - Increment to trigger a manual POI fetch
 * @param {Function} props.onPoisLoaded           - Called with PoiResult for the current viewport
 * @param {Function} props.onPoisLoadingChange    - Called with boolean while a fetch is in-flight
 * @param {boolean}  props.transitEnabled         - Show transit routes layer
 * @param {object}   props.transitVisible         - { [routeId]: boolean }
 * @param {Function} props.onTransitRoutesLoaded  - Called with TransitRoute[] after each viewport fetch
 * @param {Function} props.onMapClick             - Called with Leaflet LatLng on click
 * @param {Function} [props.onLocate]             - Called with {lat,lng} when GPS fix is obtained
 */
export default function MapView({
  startPoint, endPoint, route, mode, activePin,
  altRoutes = [], detourWaypoint = null, waypoints = [], pois = {}, poisEnabled = {}, poiRequestId = 0,
  onPoisLoaded, onPoisLoadingChange, onPoiError,
  transitEnabled = false, transitVisible = {}, onTransitRoutesLoaded,
  onMapClick, onRouteClick, onLocate,
}) {
  const defaultCenter = MAP_DEFAULT_CENTER

  function getHint() {
    if (activePin === 'waypoint') return 'Click on the map to place a waypoint'
    if (mode === 'loop') return 'Click on the map to set the loop start point'
    return activePin === 'start'
      ? 'Click on the map to set the start point'
      : 'Click on the map to set the end point'
  }

  return (
    <div className="map-wrapper">
      <div className="map-hint">{getHint()}</div>
      <MapContainer center={defaultCenter} zoom={13} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ScaleControl position="bottomright" imperial={false} />
        <LocateButton onLocate={onLocate} />
        <ClickHandler onMapClick={onMapClick} />
        <PoiLayer
          enabledTypes={route ? Object.entries(poisEnabled).filter(([, v]) => v).map(([k]) => k) : []}
          requestId={poiRequestId}
          onPoisLoaded={onPoisLoaded ?? (() => {})}
          onLoadingChange={onPoisLoadingChange ?? (() => {})}
          onError={onPoiError}
        />
        <TransitRoutesLayer
          enabled={transitEnabled}
          visible={transitVisible}
          onRoutesLoaded={onTransitRoutesLoaded ?? (() => {})}
        />

        {startPoint && <Marker position={startPoint} icon={startIcon}><Popup>Start</Popup></Marker>}
        {endPoint   && <Marker position={endPoint}   icon={endIcon}>  <Popup>End</Popup>  </Marker>}

        {waypoints.map((wp, i) => (
          <Marker key={i} position={wp} icon={makeNumberedWaypointIcon(i + 1)}>
            <Popup>Waypoint {i + 1}</Popup>
          </Marker>
        ))}

        {detourWaypoint && (
          <Marker position={detourWaypoint} icon={detourIcon}>
            <Popup>Detour point</Popup>
          </Marker>
        )}

        {altRoutes.map((coords, i) => (
          <Polyline key={i} positions={coords} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.5 }} />
        ))}

        {route && (
          <Polyline
            positions={route}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }}
            eventHandlers={onRouteClick ? { click: (e) => { e.originalEvent.stopPropagation(); onRouteClick(e.latlng) } } : {}}
          />
        )}

        {Object.entries(pois).map(([type, nodes]) =>
          poisEnabled[type]
            ? nodes.map((node) => (
                <TransitMarker
                  key={node.id}
                  node={node}
                  type={type}
                />
              ))
            : null
        )}
      </MapContainer>
    </div>
  )
}
