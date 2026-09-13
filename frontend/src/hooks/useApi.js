import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE } from '../utils/constants'

export function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(() => {
    if (!endpoint) return
    setLoading(true)
    fetch(`${API_BASE}${endpoint}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(d => { setData(d); setError(null); setLastUpdated(new Date()) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [endpoint])

  useEffect(() => {
    fetchData()
  }, [endpoint, ...deps])

  return { data, loading, error, lastUpdated, refetch: fetchData }
}

export function useAutoRefresh(refetchFns, intervalMs = 60000) {
  const fnsRef = useRef(refetchFns)
  fnsRef.current = refetchFns

  useEffect(() => {
    if (intervalMs <= 0) return
    const id = setInterval(() => {
      fnsRef.current.forEach(fn => { if (typeof fn === 'function') fn() })
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
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

export function useHeatmap(mineId) {
  return useApi(mineId ? `/satellite/${mineId}/heatmap` : null, [mineId])
}

export function useSatelliteTile(mineId, date = '2024-01-15') {
  return useApi(mineId ? `/satellite/${mineId}/tile?date=${date}` : null, [mineId, date])
}

export function useAnomaly(mineId) {
  return useApi(mineId ? `/anomaly/${mineId}?months=12` : null, [mineId])
}

export function useFleetAnomalies() {
  return useApi('/anomaly')
}
