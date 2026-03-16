// src/context/OfflineContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cacheData, getCachedData, clearCache, isCacheStale, cleanupStaleData } from '../services/offlineCache';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState({}); // { boards: timestamp, board_data_123: timestamp }

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup stale cache entries on app startup
  useEffect(() => {
    cleanupStaleData().catch(err => {
      console.warn('Failed to cleanup stale cache:', err);
    });
  }, []);

  /**
   * Generic fetch-with-cache helper
   * @param {string} cacheKey - Unique key for this data (e.g., 'boards', 'board_data_123')
   * @param {Function} fetchFn - Async function that fetches fresh data
   * @returns {{ data, fromCache: boolean, lastUpdated?: number, isStale?: boolean }}
   */
  const fetchWithCache = useCallback(async (cacheKey, fetchFn) => {
    // If offline, go straight to cache (skip network entirely to avoid retry delays)
    if (!navigator.onLine) {
      const cached = await getCachedData(cacheKey);
      if (cached) {
        const isStale = isCacheStale(cached.timestamp);
        setLastUpdated(prev => ({ ...prev, [cacheKey]: cached.timestamp }));
        return {
          data: cached.data,
          fromCache: true,
          lastUpdated: cached.timestamp,
          isStale
        };
      }
      // No cache available while offline
      throw new Error(`No cached data available for ${cacheKey} while offline`);
    }

    // Online: try network first
    try {
      const data = await fetchFn();

      // Cache successful response
      await cacheData(cacheKey, data);
      setLastUpdated(prev => ({ ...prev, [cacheKey]: Date.now() }));

      return { data, fromCache: false };
    } catch (error) {
      console.warn(`Network fetch failed for ${cacheKey}, trying cache:`, error.message);

      // Fallback to cache
      const cached = await getCachedData(cacheKey);
      if (cached) {
        const isStale = isCacheStale(cached.timestamp);
        setLastUpdated(prev => ({ ...prev, [cacheKey]: cached.timestamp }));
        return {
          data: cached.data,
          fromCache: true,
          lastUpdated: cached.timestamp,
          isStale
        };
      }

      // No cache available, re-throw
      throw error;
    }
  }, []);

  // Get last updated timestamp for a specific cache key
  const getLastUpdated = useCallback((cacheKey) => {
    return lastUpdated[cacheKey];
  }, [lastUpdated]);

  // Clear all cached data
  const clearAllCache = useCallback(async () => {
    await clearCache();
    setLastUpdated({});
  }, []);

  return (
    <OfflineContext.Provider value={{
      isOffline,
      fetchWithCache,
      getLastUpdated,
      clearAllCache,
      lastUpdated
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};
