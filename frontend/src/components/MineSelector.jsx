import { MINE_COLORS } from '../utils/constants'

export default function MineSelector({ mines, selected, onSelect }) {
  if (!mines) return null

  return (
    <select
      value={selected || ''}
      onChange={e => onSelect(e.target.value)}
      className="px-4 py-2 rounded-lg border border-border bg-card text-text-main font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">All Mines</option>
      {mines.map(m => (
        <option key={m.id} value={m.id}>
          {m.name} — {m.state} ({m.type})
        </option>
      ))}
    </select>
  )
}
