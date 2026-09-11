import { useState, useEffect } from 'react'
import { API_BASE } from '../utils/constants'

export function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!endpoint) return
    setLoading(true)
    fetch(`${API_BASE}${endpoint}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [endpoint, ...deps])

  return { data, loading, error }
}

export function useMines() {
  return useApi('/mines')
}

export function useForecast(mineId, periods = 4) {
  return useApi(mineId ? `/forecast/${mineId}?periods=${periods}` : null, [mineId])
}

export function useAlerts(mineId) {
  return useApi(mineId ? `/alerts/${mineId}` : '/alerts', [mineId])
}

export function useShap(mineId) {
  return useApi(mineId ? `/forecast/${mineId}/shap` : null, [mineId])
}

export function useSatellite(mineId, limit = 90) {
  return useApi(mineId ? `/satellite/${mineId}?limit=${limit}` : null, [mineId])
}

export function useProduction(mineId, limit = 24) {
  return useApi(mineId ? `/satellite/${mineId}/production?limit=${limit}` : null, [mineId])
}
