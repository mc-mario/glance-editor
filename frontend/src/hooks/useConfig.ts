import { useState, useEffect, useCallback, useRef } from 'react';
import type { GlanceConfig, ConfigResponse } from '../types';
import { api } from '../services/api';

interface UseConfigReturn {
  config: GlanceConfig | null;
  rawConfig: string;
  loading: boolean;
  error: string | null;
  saving: boolean;
  reload: () => Promise<void>;
  updateConfig: (config: GlanceConfig) => Promise<void>;
  updateRawConfig: (raw: string) => Promise<void>;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<GlanceConfig | null>(null);
  const [rawConfig, setRawConfig] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isInitialLoad = useRef(true);
  const pendingSave = useRef(false);

  const loadConfig = useCallback(async (showLoading = false) => {
    if (pendingSave.current) return;
    
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response: ConfigResponse = await api.getConfig();
      setConfig(response.config);
      setRawConfig(response.raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: GlanceConfig) => {
    const previousConfig = config;
    try {
      pendingSave.current = true;
      setSaving(true);
      setError(null);
      setConfig(newConfig);
      await api.updateConfig(newConfig);
    } catch (err) {
      setConfig(previousConfig);
      setError(err instanceof Error ? err.message : 'Failed to save config');
      throw err;
    } finally {
      setSaving(false);
      setTimeout(() => {
        pendingSave.current = false;
      }, 500);
    }
  }, [config]);

  const updateRawConfig = useCallback(async (raw: string) => {
    try {
      pendingSave.current = true;
      setSaving(true);
      setError(null);
      await api.updateConfigRaw(raw);
      setRawConfig(raw);
      const response = await api.getConfig();
      setConfig(response.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      throw err;
    } finally {
      setSaving(false);
      setTimeout(() => {
        pendingSave.current = false;
      }, 500);
    }
  }, []);

  const reload = useCallback(async () => {
    await loadConfig(false);
  }, [loadConfig]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadConfig(true);
    }
  }, [loadConfig]);

  return {
    config,
    rawConfig,
    loading,
    error,
    saving,
    reload,
    updateConfig,
    updateRawConfig,
  };
}

interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: unknown;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { connected, lastMessage };
}
