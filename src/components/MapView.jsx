import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'
import { fetchStopRoutes } from '../services/overpass'
import { MAP_DEFAULT_CENTER } from '../config/defaults'

// Fix Leaflet's default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const startIcon    = makeColorIcon('green')
const endIcon      = makeColorIcon('red')
const waypointIcon = makeColorIcon('violet')
const detourIcon   = makeColorIcon('orange')

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
 * Routes are read from the OSM route_ref tag; if absent, fetched lazily
 * from Overpass when the popup opens.
 *
 * @param {{ node: import('../services/overpass').PoiNode, label: string }} props
 */
function TransitPopup({ node, label }) {
  const [routes, setRoutes] = useState(() =>
    node.routeRef ? node.routeRef.split(';').map((r) => r.trim()).filter(Boolean) : null
  )

  useEffect(() => {
    if (routes !== null) return
    fetchStopRoutes(node.id).then(setRoutes).catch(() => setRoutes([]))
  }, [node.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span>
      <strong>{label}</strong>
      {node.name && <><br />{node.name}</>}
      {node.stopRef && <><br />Stop: {node.stopRef}</>}
      {routes === null && <><br /><em>Loading lines…</em></>}
      {routes?.length > 0 && <><br />Lines: {routes.join(', ')}</>}
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
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
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
 * @param {object}   props.pois           - { bench: PoiNode[], water: PoiNode[], viewpoint: PoiNode[] }
 * @param {object}   props.poisEnabled    - { bench: boolean, water: boolean, viewpoint: boolean }
 * @param {Function} props.onMapClick     - Called with Leaflet LatLng on click
 */
export default function MapView({
  startPoint, endPoint, route, mode, activePin,
  altRoutes = [], detourWaypoint = null, waypoints = [], pois = {}, poisEnabled = {},
  onMapClick, onRouteClick,
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
        <ClickHandler onMapClick={onMapClick} />

        {startPoint && <Marker position={startPoint} icon={startIcon}><Popup>Start</Popup></Marker>}
        {endPoint   && <Marker position={endPoint}   icon={endIcon}>  <Popup>End</Popup>  </Marker>}

        {waypoints.map((wp, i) => (
          <Marker key={i} position={wp} icon={waypointIcon}>
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
                <CircleMarker
                  key={node.id}
                  center={[node.lat, node.lon]}
                  radius={6}
                  pathOptions={{ color: POI_STYLE[type]?.color, fillColor: POI_STYLE[type]?.color, fillOpacity: 0.8 }}
                >
                  <Popup>
                    {TRANSIT_TYPES.has(type)
                      ? <TransitPopup node={node} label={POI_STYLE[type]?.label} />
                      : `${POI_STYLE[type]?.label}${node.name ? ` — ${node.name}` : ''}`}
                  </Popup>
                </CircleMarker>
              ))
            : null
        )}
      </MapContainer>
    </div>
  )
}
