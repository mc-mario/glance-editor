import { useState, useEffect, useCallback, useRef } from 'react';
import type { GlanceConfig, ConfigResponse, YamlParseError } from '../types';
import { api } from '../services/api';

const DEBOUNCE_MS = 300;

export interface HistoryEntry {
  config: GlanceConfig;
  description: string;
  timestamp: number;
}

const MAX_HISTORY_SIZE = 50;

interface UseConfigReturn {
  config: GlanceConfig | null;
  rawConfig: string;
  loading: boolean;
  error: string | null;
  parseError: YamlParseError | null;
  saving: boolean;
  reload: () => Promise<void>;
  updateConfig: (config: GlanceConfig, description?: string) => Promise<void>;
  updateRawConfig: (raw: string) => Promise<void>;
  // History/Undo-Redo functionality
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  historyEntries: HistoryEntry[];
  currentHistoryIndex: number;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<GlanceConfig | null>(null);
  const [rawConfig, setRawConfig] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<YamlParseError | null>(null);
  const [saving, setSaving] = useState(false);
  
  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);
  
  const isInitialLoad = useRef(true);
  const pendingSave = useRef(false);
  const debounceTimerRef = useRef<number>();
  const latestConfigRef = useRef<GlanceConfig | null>(null);
  const latestDescriptionRef = useRef<string>('Update config');
  const saveInProgressRef = useRef(false);

  // History computed values
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1 && history.length > 0;
  const undoDescription = canUndo ? history[currentIndex].description : null;
  const redoDescription = canRedo ? history[currentIndex + 1].description : null;

  const pushHistory = useCallback((newConfig: GlanceConfig, description: string) => {
    if (isUndoRedoRef.current) return;
    
    setHistory(prev => {
      // Truncate future states if we're not at the end
      const newHistory = currentIndex >= 0 ? prev.slice(0, currentIndex + 1) : [];
      
      // Don't push duplicate states
      const lastEntry = newHistory[newHistory.length - 1];
      if (lastEntry && JSON.stringify(lastEntry.config) === JSON.stringify(newConfig)) {
        return prev;
      }
      
      const newEntry: HistoryEntry = {
        config: structuredClone(newConfig),
        description,
        timestamp: Date.now(),
      };
      
      newHistory.push(newEntry);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const baseIndex = prev >= 0 ? prev : -1;
      return Math.min(baseIndex + 1, MAX_HISTORY_SIZE - 1);
    });
  }, [currentIndex]);

  const loadConfig = useCallback(async (showLoading = false) => {
    if (pendingSave.current) return;
    
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response: ConfigResponse = await api.getConfig();
      setConfig(response.config);
      setRawConfig(response.raw);
      setParseError(response.parseError || null);
      
      // Initialize history with first loaded config
      if (response.config && history.length === 0) {
        setHistory([{
          config: structuredClone(response.config),
          description: 'Initial state',
          timestamp: Date.now(),
        }]);
        setCurrentIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [history.length]);

  const performSave = useCallback(async (configToSave: GlanceConfig, previousConfig: GlanceConfig | null, description: string) => {
    if (saveInProgressRef.current) return;
    
    saveInProgressRef.current = true;
    try {
      pendingSave.current = true;
      setSaving(true);
      setError(null);
      await api.updateConfig(configToSave);
      
      // Push to history after successful save
      pushHistory(configToSave, description);
      
      // Refetch rawConfig after saving to keep it in sync
      // This is needed so Monaco Editor shows the updated YAML
      try {
        const response = await api.getConfig();
        setRawConfig(response.raw);
        setParseError(response.parseError || null);
      } catch {
        // Ignore refetch errors - we already saved successfully
      }
    } catch (err) {
      setConfig(previousConfig);
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
      saveInProgressRef.current = false;
      setTimeout(() => {
        pendingSave.current = false;
      }, 500);
    }
  }, [pushHistory]);

  const updateConfig = useCallback(async (newConfig: GlanceConfig, description: string = 'Update config') => {
    const previousConfig = config;
    
    // Update local state immediately for responsiveness
    setConfig(newConfig);
    latestConfigRef.current = newConfig;
    latestDescriptionRef.current = description;
    
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the actual save
    debounceTimerRef.current = window.setTimeout(() => {
      const configToSave = latestConfigRef.current;
      const desc = latestDescriptionRef.current;
      if (configToSave) {
        performSave(configToSave, previousConfig, desc);
      }
    }, DEBOUNCE_MS);
  }, [config, performSave]);

  const updateRawConfig = useCallback(async (raw: string) => {
    try {
      pendingSave.current = true;
      setSaving(true);
      setError(null);
      await api.updateConfigRaw(raw);
      setRawConfig(raw);
      const response = await api.getConfig();
      setConfig(response.config);
      setParseError(response.parseError || null);
      
      // Push to history after raw config update
      if (response.config) {
        pushHistory(response.config, 'Edit YAML directly');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      throw err;
    } finally {
      setSaving(false);
      setTimeout(() => {
        pendingSave.current = false;
      }, 500);
    }
  }, [pushHistory]);

  const undo = useCallback(async () => {
    if (!canUndo) return;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    const previousState = history[newIndex];
    
    try {
      setSaving(true);
      setConfig(previousState.config);
      await api.updateConfig(previousState.config);
      setCurrentIndex(newIndex);
      
      // Refetch to sync rawConfig
      const response = await api.getConfig();
      setRawConfig(response.raw);
      setParseError(response.parseError || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to undo');
    } finally {
      setSaving(false);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(async () => {
    if (!canRedo) return;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    const nextState = history[newIndex];
    
    try {
      setSaving(true);
      setConfig(nextState.config);
      await api.updateConfig(nextState.config);
      setCurrentIndex(newIndex);
      
      // Refetch to sync rawConfig
      const response = await api.getConfig();
      setRawConfig(response.raw);
      setParseError(response.parseError || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redo');
    } finally {
      setSaving(false);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [canRedo, currentIndex, history]);

  const reload = useCallback(async () => {
    await loadConfig(false);
  }, [loadConfig]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      loadConfig(true);
    }
  }, [loadConfig]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    config,
    rawConfig,
    loading,
    error,
    parseError,
    saving,
    reload,
    updateConfig,
    updateRawConfig,
    // History
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    undo,
    redo,
    historyEntries: history,
    currentHistoryIndex: currentIndex,
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
