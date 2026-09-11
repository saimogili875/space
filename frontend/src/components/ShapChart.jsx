import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

const FEATURE_LABELS = {
  actual_tonnes_lag1: 'Last Month Output',
  actual_tonnes_roll3_mean: '3-Month Avg',
  actual_tonnes_roll6_mean: '6-Month Avg',
  actual_tonnes_roll12_mean: '12-Month Avg',
  actual_tonnes_lag12: 'Same Month Last Year',
  heavy_rain_days: 'Heavy Rain Days',
  rainy_days: 'Rainy Days',
  rainfall_mm_sum: 'Total Rainfall',
  rainfall_mm_mean: 'Avg Rainfall',
  is_monsoon: 'Monsoon Season',
  avg_equipment_age: 'Equipment Age',
  avg_utilization: 'Equipment Utilization',
  operational_ratio: 'Operational Ratio',
  avg_failure_prob: 'Failure Probability',
  temperature_c_mean: 'Avg Temperature',
  soil_moisture_mean: 'Soil Moisture',
  ndvi_mean: 'Vegetation Index',
  month: 'Month',
  quarter: 'Quarter',
  yoy_change: 'Year-on-Year Change',
}

const BAR_COLORS = ['#1a365d', '#2a4a7f', '#3b5998', '#4a69a5', '#5a7ab2', '#6b8abf', '#7c9bcc', '#8cacd9', '#9dbde6', '#aecef3']

export default function ShapChart({ shap }) {
  if (!shap || shap.length === 0) {
    return <div className="h-full flex items-center justify-center text-text-muted">Select a mine to view feature importance</div>
  }

  const data = shap.slice(0, 10).map(s => ({
    ...s,
    label: FEATURE_LABELS[s.feature] || s.feature,
    value: s.importance,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={v => v.toFixed(2)}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 11, fill: '#334155' }}
        />
        <Tooltip
          formatter={v => [v.toFixed(4), 'Importance']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i] || BAR_COLORS[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
