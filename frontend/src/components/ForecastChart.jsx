import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts'
import { ALERT_COLORS } from '../utils/constants'

export default function ForecastChart({ forecast, production }) {
  if (!forecast || forecast.length === 0) {
    return <div className="h-full flex items-center justify-center text-text-muted">Select a mine to view forecast</div>
  }

  const historyData = (production || []).map(p => ({
    period: p.date.slice(0, 7),
    actual: Math.round(p.actual_tonnes),
    target: Math.round(p.target_tonnes),
    type: 'history',
  }))

  const forecastData = forecast.map(f => ({
    period: f.period,
    predicted: f.predicted_tonnes,
    target: f.target_tonnes,
    lower: f.confidence_lower,
    upper: f.confidence_upper,
    alert: f.alert_level,
    type: 'forecast',
  }))

  const combined = [...historyData.slice(-12), ...forecastData]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={combined} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => v.slice(2)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          width={45}
        />
        <Tooltip
          formatter={(v, name) => [`${Math.round(v).toLocaleString()} tonnes`, name]}
          labelFormatter={l => `Period: ${l}`}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <Legend />

        <Area
          dataKey="upper"
          stackId="confidence"
          fill="#3b82f620"
          stroke="none"
          name="Confidence Band"
          connectNulls={false}
        />
        <Area
          dataKey="lower"
          stackId="confidence"
          fill="#ffffff"
          stroke="none"
          name=""
          connectNulls={false}
          legendType="none"
        />

        <Line
          dataKey="target"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          name="Target"
        />
        <Line
          dataKey="actual"
          stroke="#1a365d"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          name="Actual"
          connectNulls={false}
        />
        <Line
          dataKey="predicted"
          stroke="#e67e22"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#e67e22' }}
          name="Predicted"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
