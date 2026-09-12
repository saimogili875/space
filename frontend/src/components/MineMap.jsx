import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import { MINE_COLORS, ALERT_COLORS } from '../utils/constants'
import HeatmapOverlay from './HeatmapOverlay'
import 'leaflet/dist/leaflet.css'

const CENTER = [21.4, 79.6]
const ZOOM = 8

export default function MineMap({ mines, alerts, selected, onSelect, heatmap }) {
  if (!mines) return <div className="h-full flex items-center justify-center text-text-muted">Loading map...</div>

  const alertMap = {}
  if (alerts) {
    for (const a of alerts) {
      alertMap[a.mine_id] = a.alert_level
    }
  }

  return (
    <MapContainer center={CENTER} zoom={ZOOM} className="h-full w-full rounded-lg" scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {heatmap && <HeatmapOverlay data={heatmap} />}
      {mines.map(mine => {
        const alertLevel = alertMap[mine.id]
        const color = alertLevel ? ALERT_COLORS[alertLevel] : (MINE_COLORS[mine.id] || '#3498db')
        const isSelected = selected === mine.id
        return (
          <CircleMarker
            key={mine.id}
            center={[mine.lat, mine.lon]}
            radius={isSelected ? 14 : 10}
            pathOptions={{
              color: isSelected ? '#1a365d' : color,
              fillColor: color,
              fillOpacity: 0.8,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onSelect(mine.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={isSelected}>
              <span className="font-semibold">{mine.name}</span>
              {alertLevel && (
                <span className="ml-1 text-xs" style={{ color: ALERT_COLORS[alertLevel] }}>
                  [{alertLevel}]
                </span>
              )}
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-base mb-1">{mine.name}</p>
                <p>State: {mine.state}</p>
                <p>Type: {mine.type}</p>
                <p>Depth: {mine.depth_m}m</p>
                <p>Grade: {mine.ore_grade_pct}%</p>
                <p>Base output: {mine.base_monthly_tonnes.toLocaleString()} t/month</p>
                <p>Since: {mine.active_since}</p>
                {heatmap && (
                  <p className="mt-1 font-semibold text-orange-600">
                    Mn Probability: {(heatmap.avg_probability * 100).toFixed(0)}% avg
                    <br />High-prob area: {heatmap.high_prob_area_pct}%
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
