import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

function MiniChart({ data, dataKey, color, unit, title }) {
  if (!data || data.length === 0) return null

  const recent = data.slice(-30)
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs text-text-muted font-medium mb-1">{title}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {recent[recent.length - 1][dataKey]?.toFixed(1)}{unit}
      </p>
      <div className="h-16 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recent}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              dataKey={dataKey}
              stroke={color}
              fill={`url(#grad-${dataKey})`}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function WeatherPanel({ weather }) {
  if (!weather || weather.length === 0) {
    return <div className="h-full flex items-center justify-center text-text-muted">Select a mine to view weather</div>
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-4">
        <MiniChart data={weather} dataKey="rainfall_mm" color="#3498db" unit=" mm" title="Rainfall" />
        <MiniChart data={weather} dataKey="temperature_c" color="#e74c3c" unit="°C" title="Temperature" />
      </div>
      <div className="flex gap-4">
        <MiniChart data={weather} dataKey="soil_moisture" color="#8b5cf6" unit="" title="Soil Moisture" />
        <MiniChart data={weather} dataKey="ndvi" color="#27ae60" unit="" title="NDVI" />
      </div>
    </div>
  )
}
