import { useState, useCallback } from 'react'
import { API_BASE } from '../utils/constants'
import { ALERT_COLORS } from '../utils/constants'

const SLIDERS = [
  { key: 'rainfall', label: 'Rainfall', unit: '%', min: -80, max: 200, step: 10, default: 0, icon: '🌧' },
  { key: 'temperature', label: 'Temperature', unit: '°C', min: -5, max: 8, step: 0.5, default: 0, icon: '🌡' },
  { key: 'equipment_health', label: 'Equipment Health', unit: '%', min: -30, max: 20, step: 5, default: 0, icon: '⚙' },
  { key: 'soil_moisture', label: 'Soil Moisture', unit: '%', min: -50, max: 100, step: 10, default: 0, icon: '💧' },
]

function formatDelta(val) {
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toLocaleString()}`
}

export default function WhatIfSimulator({ mineId, mineName }) {
  const [values, setValues] = useState(
    Object.fromEntries(SLIDERS.map(s => [s.key, s.default]))
  )
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: parseFloat(val) }))
  }

  const reset = () => {
    setValues(Object.fromEntries(SLIDERS.map(s => [s.key, s.default])))
    setResult(null)
  }

  const simulate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/whatif/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mine_id: mineId, adjustments: values }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e) {
      console.error('Simulation failed:', e)
    } finally {
      setLoading(false)
    }
  }, [mineId, values])

  const hasChanges = Object.entries(values).some(([key, val]) => {
    const slider = SLIDERS.find(s => s.key === key)
    return val !== slider.default
  })

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {SLIDERS.map(slider => {
          const val = values[slider.key]
          const isChanged = val !== slider.default
          return (
            <div key={slider.key} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {slider.icon} {slider.label}
                </label>
                <span className={`text-sm font-mono font-bold ${isChanged ? 'text-accent' : 'text-gray-500'}`}>
                  {val >= 0 && slider.key !== 'temperature' ? '+' : ''}{val}{slider.unit}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={val}
                onChange={e => handleChange(slider.key, e.target.value)}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{slider.min}{slider.unit}</span>
                <span>{slider.default}{slider.unit}</span>
                <span>{slider.max}{slider.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={simulate}
          disabled={loading || !hasChanges}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Reset
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-lg p-3 text-center ${
              result.summary.total_delta >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className="text-[10px] text-gray-500 uppercase font-medium">Production Impact</p>
              <p className={`text-lg font-bold ${
                result.summary.total_delta >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatDelta(result.summary.total_delta)} t
              </p>
              <p className="text-xs text-gray-500">{formatDelta(result.summary.delta_pct)}%</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${
              result.summary.value_impact_crore >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className="text-[10px] text-gray-500 uppercase font-medium">Revenue Impact</p>
              <p className={`text-lg font-bold ${
                result.summary.value_impact_crore >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatDelta(result.summary.value_impact_crore)} Cr
              </p>
              <p className="text-xs text-gray-500">@ Rs 7,000/t</p>
            </div>
            <div className="rounded-lg p-3 text-center bg-blue-50 dark:bg-blue-900/20">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Alert Changes</p>
              <p className="text-lg font-bold text-primary">
                {result.summary.improved_alerts > 0 ? `${result.summary.improved_alerts} improved` :
                 result.summary.worsened_alerts > 0 ? `${result.summary.worsened_alerts} worsened` :
                 'No change'}
              </p>
            </div>
          </div>

          {/* Period breakdown */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-2 py-1.5 text-left">Period</th>
                  <th className="px-2 py-1.5 text-right">Baseline</th>
                  <th className="px-2 py-1.5 text-right">Modified</th>
                  <th className="px-2 py-1.5 text-right">Delta</th>
                  <th className="px-2 py-1.5 text-center">Before</th>
                  <th className="px-2 py-1.5 text-center">After</th>
                </tr>
              </thead>
              <tbody>
                {result.periods.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-2 py-1.5 font-medium">{p.period}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{p.baseline_tonnes.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{p.modified_tonnes.toLocaleString()}</td>
                    <td className={`px-2 py-1.5 text-right font-mono font-bold ${
                      p.delta_tonnes >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatDelta(p.delta_tonnes)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: ALERT_COLORS[p.baseline_alert] || '#999' }}>
                        {p.baseline_alert}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: ALERT_COLORS[p.modified_alert] || '#999' }}>
                        {p.modified_alert}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
