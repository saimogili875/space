import { useState, useCallback } from 'react'
import { API_BASE, ALERT_COLORS, MINE_COLORS } from '../utils/constants'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

export default function MineCompare({ mines, currentMineId }) {
  const [selectedMines, setSelectedMines] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggleMine = (mineId) => {
    setSelectedMines(prev => {
      if (prev.includes(mineId)) return prev.filter(m => m !== mineId)
      if (prev.length >= 4) return prev
      return [...prev, mineId]
    })
    setData(null)
  }

  const runCompare = useCallback(async () => {
    const ids = [currentMineId, ...selectedMines.filter(m => m !== currentMineId)]
    if (ids.length < 2) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/compare?mine_ids=${ids.join(',')}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      console.error('Compare failed:', e)
    } finally {
      setLoading(false)
    }
  }, [currentMineId, selectedMines])

  const otherMines = (mines || []).filter(m => m.id !== currentMineId)
  const compareIds = [currentMineId, ...selectedMines.filter(m => m !== currentMineId)]

  const trendData = data ? (() => {
    const periods = new Set()
    data.mines.forEach(m => m.trend_12m.forEach(t => periods.add(t.period)))
    const sorted = [...periods].sort()
    return sorted.map(p => {
      const row = { period: p }
      data.mines.forEach(m => {
        const point = m.trend_12m.find(t => t.period === p)
        if (point) row[m.mine_id] = point.actual
      })
      return row
    })
  })() : []

  return (
    <div className="space-y-4">
      {/* Mine picker */}
      <div>
        <p className="text-xs text-text-muted mb-2">Select up to 3 mines to compare with current mine:</p>
        <div className="flex flex-wrap gap-2">
          {otherMines.map(mine => {
            const isSelected = selectedMines.includes(mine.id)
            return (
              <button
                key={mine.id}
                onClick={() => toggleMine(mine.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-muted hover:border-primary'
                }`}
              >
                {mine.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Compare button */}
      <button
        onClick={runCompare}
        disabled={loading || selectedMines.length === 0}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {loading ? 'Comparing...' : `Compare ${compareIds.length} Mines`}
      </button>

      {/* Results */}
      {data && (
        <>
          {/* Metrics table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-2 text-left">Metric</th>
                  {data.mines.map(m => (
                    <th key={m.mine_id} className="px-3 py-2 text-center">{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-medium">Type</td>
                  {data.mines.map(m => <td key={m.mine_id} className="px-3 py-2 text-center capitalize">{m.type}</td>)}
                </tr>
                <tr className="border-b border-border bg-surface">
                  <td className="px-3 py-2 font-medium">Ore Grade</td>
                  {data.mines.map(m => <td key={m.mine_id} className="px-3 py-2 text-center">{m.ore_grade_pct}%</td>)}
                </tr>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-medium">Avg Production (12m)</td>
                  {data.mines.map(m => (
                    <td key={m.mine_id} className="px-3 py-2 text-center font-mono">
                      {m.avg_production_12m.toLocaleString()}t
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border bg-surface">
                  <td className="px-3 py-2 font-medium">Avg Shortfall</td>
                  {data.mines.map(m => (
                    <td key={m.mine_id} className="px-3 py-2 text-center font-bold"
                      style={{ color: m.avg_shortfall_pct < -5 ? '#e74c3c' : m.avg_shortfall_pct < 0 ? '#f39c12' : '#27ae60' }}>
                      {m.avg_shortfall_pct > 0 ? '+' : ''}{m.avg_shortfall_pct}%
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-medium">Health Score</td>
                  {data.mines.map(m => (
                    <td key={m.mine_id} className="px-3 py-2 text-center font-bold"
                      style={{ color: m.health_score >= 80 ? '#27ae60' : m.health_score >= 60 ? '#f39c12' : '#e74c3c' }}>
                      {m.health_score}/100
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border bg-surface">
                  <td className="px-3 py-2 font-medium">Anomalies (6m)</td>
                  {data.mines.map(m => (
                    <td key={m.mine_id} className="px-3 py-2 text-center">
                      {m.anomaly_count > 0 ? (
                        <span className="text-red-500 font-bold">{m.anomaly_count}</span>
                      ) : (
                        <span className="text-green-500">0</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Next Forecast</td>
                  {data.mines.map(m => (
                    <td key={m.mine_id} className="px-3 py-2 text-center">
                      {m.next_prediction ? (
                        <div>
                          <span className="font-mono">{m.next_prediction.predicted_tonnes.toLocaleString()}t</span>
                          <br/>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: ALERT_COLORS[m.next_prediction.alert_level] || '#999' }}>
                            {m.next_prediction.alert_level}
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trend chart */}
          {trendData.length > 0 && (
            <div className="h-48">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">12-Month Production Trend</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(2)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip
                    formatter={(v, name) => [`${Math.round(v).toLocaleString()}t`, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {data.mines.map(m => (
                    <Line
                      key={m.mine_id}
                      dataKey={m.mine_id}
                      name={m.name}
                      stroke={MINE_COLORS[m.mine_id] || '#666'}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
