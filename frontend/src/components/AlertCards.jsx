import { ALERT_COLORS, ALERT_BG } from '../utils/constants'

function AlertBadge({ level }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-bold text-white"
      style={{ backgroundColor: ALERT_COLORS[level] }}
    >
      {level.replace('_', ' ')}
    </span>
  )
}

export default function AlertCards({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        No active alerts
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
      {alerts.map((alert, i) => (
        <div
          key={`${alert.mine_id}-${alert.period}-${i}`}
          className="rounded-lg border p-3"
          style={{
            backgroundColor: ALERT_BG[alert.alert_level],
            borderColor: ALERT_COLORS[alert.alert_level] + '40',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-sm">{alert.mine_name}</span>
            <AlertBadge level={alert.alert_level} />
          </div>
          <p className="text-xs text-text-muted mb-2">
            {alert.period} — Expected shortfall of{' '}
            <span className="font-bold" style={{ color: ALERT_COLORS[alert.alert_level] }}>
              {Math.abs(alert.shortfall_pct).toFixed(1)}%
            </span>
          </p>

          {alert.actions.length > 0 && (
            <div className="border-t pt-2 mt-1" style={{ borderColor: ALERT_COLORS[alert.alert_level] + '20' }}>
              <p className="text-xs font-semibold text-text-muted mb-1">Recommended Actions:</p>
              {alert.actions.slice(0, 3).map(action => (
                <div key={action.id} className="flex items-start gap-1.5 mb-1">
                  <span className="text-xs mt-0.5 flex-shrink-0">
                    {action.priority}.
                  </span>
                  <div className="text-xs">
                    <span>{action.action}</span>
                    <span className="text-text-muted ml-1">
                      (+{action.estimated_recovery_tonnes.toLocaleString()}t / Rs {action.estimated_value_crore}Cr)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
