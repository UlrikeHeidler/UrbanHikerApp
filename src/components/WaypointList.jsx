import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './WaypointList.css'

/**
 * A single draggable waypoint row.
 *
 * @param {{ id: string, index: number, wp: object, label: string|null, onRemove: Function }} props
 */
function SortableWaypoint({ id, index, wp, label, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const display = label === null || label === undefined
    ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`
    : label !== ''
      ? label
      : `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`

  return (
    <li ref={setNodeRef} style={style} className="waypoint-item">
      <span className="waypoint-drag" {...attributes} {...listeners} aria-label="Drag to reorder">⠿</span>
      <span className="waypoint-dot">{index + 1}</span>
      <span className="waypoint-coord" title={`${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}>
        {display}
      </span>
      <button className="waypoint-remove" onClick={() => onRemove(index)} aria-label="Remove waypoint">✕</button>
    </li>
  )
}

/**
 * Displays the current waypoint list with drag-to-reorder and add/remove controls.
 * Only shown in A-to-B mode.
 *
 * @param {object}   props
 * @param {object[]} props.waypoints       - Array of {lat, lng} waypoints
 * @param {Array}    props.waypointLabels  - Resolved address per waypoint (null=loading, ''=no address)
 * @param {boolean}  props.isAdding        - True when activePin === 'waypoint'
 * @param {Function} props.onStartAdd      - Called when the user wants to add a waypoint
 * @param {Function} props.onRemove        - Called with the waypoint index to remove
 * @param {Function} props.onReorder       - Called with (fromIndex, toIndex) after a drag
 */
export default function WaypointList({ waypoints, waypointLabels = [], isAdding, onStartAdd, onRemove, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = waypoints.findIndex((_, i) => String(i) === active.id)
    const to   = waypoints.findIndex((_, i) => String(i) === over.id)
    if (from !== -1 && to !== -1) onReorder(from, to)
  }

  return (
    <div className="waypoint-list">
      <div className="waypoint-header">
        <span className="waypoint-title">Via (waypoints)</span>
        <button
          className={`waypoint-add-btn ${isAdding ? 'adding' : ''}`}
          onClick={onStartAdd}
        >
          {isAdding ? '📍 Click map…' : '+ Add waypoint'}
        </button>
      </div>

      {waypoints.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={waypoints.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
            <ul className="waypoint-items">
              {waypoints.map((wp, i) => (
                <SortableWaypoint
                  key={i}
                  id={String(i)}
                  index={i}
                  wp={wp}
                  label={waypointLabels[i]}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
