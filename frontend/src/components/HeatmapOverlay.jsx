import { useEffect } from 'react'
import { useMap, CircleMarker, Tooltip } from 'react-leaflet'

function getColor(prob) {
  if (prob > 0.8) return '#e74c3c'
  if (prob > 0.6) return '#e67e22'
  if (prob > 0.4) return '#f1c40f'
  if (prob > 0.2) return '#2ecc71'
  return '#3498db'
}

export default function HeatmapOverlay({ data }) {
  const map = useMap()

  useEffect(() => {
    if (data?.center) {
      map.setView([data.center.lat, data.center.lon], 12)
    }
  }, [data, map])

  if (!data?.points) return null

  return (
    <>
      {data.points.map((pt, i) => (
        <CircleMarker
          key={i}
          center={[pt.lat, pt.lon]}
          radius={4}
          pathOptions={{
            color: 'transparent',
            fillColor: getColor(pt.probability),
            fillOpacity: Math.min(pt.probability * 0.7, 0.6),
          }}
        >
          <Tooltip>
            Mn Probability: {(pt.probability * 100).toFixed(1)}%
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}
