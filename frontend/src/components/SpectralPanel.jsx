import { useSatelliteTile } from '../hooks/useApi'

const INDEX_INFO = {
  iron_oxide: { label: 'Iron Oxide (B4/B2)', color: '#e74c3c', threshold: 1.5 },
  hydroxyl: { label: 'Hydroxyl (B11/B12)', color: '#e67e22', threshold: 1.2 },
  ferrous: { label: 'Ferrous (B12/B8)', color: '#8e44ad', threshold: 0.8 },
  mn_indicator: { label: 'Mn Indicator', color: '#2c3e50', threshold: 2.0 },
  ndvi: { label: 'NDVI', color: '#27ae60', threshold: 0.3 },
}

function IndexBar({ name, value, info }) {
  const maxVal = info.threshold * 2
  const pct = Math.min((value / maxVal) * 100, 100)
  const isAbove = value >= info.threshold

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{info.label}</span>
        <span className={`font-mono font-bold ${isAbove ? 'text-red-600' : 'text-green-600'}`}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: info.color }}
        />
        <div
          className="absolute top-0 w-0.5 h-2 bg-white dark:bg-gray-300"
          style={{ left: `${(info.threshold / maxVal) * 100}%` }}
          title={`Threshold: ${info.threshold}`}
        />
      </div>
    </div>
  )
}

export default function SpectralPanel({ mineId }) {
  const { data, loading } = useSatelliteTile(mineId)

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading spectral data...</div>
  if (!data?.indices) return <div className="p-4 text-sm text-gray-500">No spectral data</div>

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-primary mb-3">
        Spectral Band Indices
        <span className="ml-2 text-xs font-normal text-gray-500">
          {data.satellite} • {data.date}
        </span>
      </h3>
      {Object.entries(INDEX_INFO).map(([key, info]) => (
        data.indices[key] !== undefined && (
          <IndexBar key={key} name={key} value={data.indices[key]} info={info} />
        )
      ))}
      {data.cloud_pct !== undefined && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <span>Cloud cover: {data.cloud_pct}%</span>
          {data.source === 'synthetic' && (
            <span className="ml-auto px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-[10px]">
              SIMULATED
            </span>
          )}
        </div>
      )}
    </div>
  )
}
