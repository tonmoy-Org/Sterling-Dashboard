import { useState, useEffect, useCallback } from 'react';
import api from '../api/status_axios';

/**
 * useScraperLogs
 *
 * Fetches scraper execution logs from the Django backend.
 * Supports query-param tracking: scraper_name, status, limit.
 *
 * @param {Object} query - { scraper_name?, status?, limit? }
 * @param {number} [refreshInterval=0] - Auto-refresh every N ms (0 = disabled)
 */
export function useScraperLogs(query = {}, refreshInterval = 0) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query params — omit empty values
      const params = {};
      if (query.scraper_name) params.scraper_name = query.scraper_name;
      if (query.status)       params.status       = query.status;
      if (query.limit)        params.limit        = query.limit;

      const { data } = await api.get('/health-check/logs/', { params });
      setLogs(data);
      setLastFetched(new Date());
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [query.scraper_name, query.status, query.limit]);

  // Fetch on mount + whenever query changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Optional polling
  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(id);
  }, [fetchLogs, refreshInterval]);

  return { logs, loading, error, refetch: fetchLogs, lastFetched };
}

/**
 * useServiceStatus
 *
 * Fetches service uptime status from the Django backend.
 */
export function useServiceStatus(refreshInterval = 0) {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/health-check/services/');
      setServices(data);
      setLastFetched(new Date());
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(id);
  }, [fetchStatus, refreshInterval]);

  return { services, loading, error, refetch: fetchStatus, lastFetched };
}
