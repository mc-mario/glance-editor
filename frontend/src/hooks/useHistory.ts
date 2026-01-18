import { useState, useCallback, useRef } from 'react';
import type { GlanceConfig } from '../types';

export interface HistoryEntry {
  config: GlanceConfig;
  description: string;
  timestamp: number;
}

interface UseHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  pushState: (config: GlanceConfig, description: string) => void;
  undo: () => GlanceConfig | null;
  redo: () => GlanceConfig | null;
  clear: () => void;
  history: HistoryEntry[];
  currentIndex: number;
}

const MAX_HISTORY_SIZE = 50;

export function useHistory(initialConfig: GlanceConfig | null): UseHistoryReturn {
  // History stack stores all states
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (initialConfig) {
      return [{
        config: structuredClone(initialConfig),
        description: 'Initial state',
        timestamp: Date.now(),
      }];
    }
    return [];
  });
  
  // Current position in history (-1 means at the latest state)
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Track if we're in the middle of an undo/redo operation
  const isUndoRedoRef = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const undoDescription = canUndo ? history[currentIndex].description : null;
  const redoDescription = canRedo ? history[currentIndex + 1].description : null;

  const pushState = useCallback((config: GlanceConfig, description: string) => {
    // Don't push state if we're in the middle of undo/redo
    if (isUndoRedoRef.current) {
      return;
    }

    setHistory(prev => {
      // If we're not at the end of history, truncate the future states
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      const newEntry: HistoryEntry = {
        config: structuredClone(config),
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
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1);
      return newIndex;
    });
  }, [currentIndex]);

  const undo = useCallback((): GlanceConfig | null => {
    if (!canUndo) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
    
    return structuredClone(history[newIndex].config);
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): GlanceConfig | null => {
    if (!canRedo) return null;
    
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
    
    return structuredClone(history[newIndex].config);
  }, [canRedo, currentIndex, history]);

  const clear = useCallback(() => {
    if (history.length > 0) {
      const currentState = history[currentIndex];
      setHistory([currentState]);
      setCurrentIndex(0);
    }
  }, [history, currentIndex]);

  return {
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    pushState,
    undo,
    redo,
    clear,
    history,
    currentIndex,
  };
}
