// src/services/offlineCache.js
import { openDB } from 'idb';

const DB_NAME = 'task-tracker-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

// Maximum number of board data entries to keep cached
// Set via VITE_MAX_CACHED_BOARDS env var, defaults to 5
const MAX_CACHED_BOARDS = parseInt(import.meta.env.VITE_MAX_CACHED_BOARDS, 10) || 5;

// Keys that are exempt from LRU eviction
const EXEMPT_KEYS = ['boards'];

// Prefix for board data keys
const BOARD_DATA_PREFIX = 'board_data_';

let dbPromise = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      }
    });
  }
  return dbPromise;
};

// Get all cache entries (for LRU and cleanup operations)
const getAllEntries = async () => {
  const db = await getDb();
  const keys = await db.getAllKeys(STORE_NAME);
  const entries = [];

  for (const key of keys) {
    const value = await db.get(STORE_NAME, key);
    if (value) {
      entries.push({ key, ...value });
    }
  }

  return entries;
};

// Enforce LRU limit on board data entries
const enforceLRULimit = async () => {
  const entries = await getAllEntries();

  // Filter to only board_data_* entries
  const boardEntries = entries.filter(e =>
    typeof e.key === 'string' && e.key.startsWith(BOARD_DATA_PREFIX)
  );

  if (boardEntries.length <= MAX_CACHED_BOARDS) {
    return; // Under limit, nothing to do
  }

  // Sort by timestamp ascending (oldest first)
  boardEntries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Delete oldest entries until we're at the limit
  const toDelete = boardEntries.slice(0, boardEntries.length - MAX_CACHED_BOARDS);
  const db = await getDb();

  for (const entry of toDelete) {
    console.log(`LRU evicting cached board: ${entry.key}`);
    await db.delete(STORE_NAME, entry.key);
  }
};

// Generic cache operations
export const cacheData = async (key, data) => {
  const db = await getDb();
  await db.put(STORE_NAME, { data, timestamp: Date.now() }, key);

  // If this is a board data entry, enforce LRU limit
  if (typeof key === 'string' && key.startsWith(BOARD_DATA_PREFIX)) {
    await enforceLRULimit();
  }
};

export const getCachedData = async (key) => {
  const db = await getDb();
  return db.get(STORE_NAME, key); // Returns { data, timestamp } or undefined
};

export const clearCache = async () => {
  const db = await getDb();
  await db.clear(STORE_NAME);
};

// Helper to check if cache is stale (>30 days old)
export const isCacheStale = (timestamp, maxAgeDays = 30) => {
  if (!timestamp) return true;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > maxAgeMs;
};

// Cleanup stale data (entries older than maxAgeDays)
// Call this on app startup
export const cleanupStaleData = async (maxAgeDays = 30) => {
  const entries = await getAllEntries();
  const db = await getDb();
  let deletedCount = 0;

  for (const entry of entries) {
    // Skip exempt keys
    if (EXEMPT_KEYS.includes(entry.key)) {
      continue;
    }

    if (isCacheStale(entry.timestamp, maxAgeDays)) {
      console.log(`Cleaning up stale cache entry: ${entry.key}`);
      await db.delete(STORE_NAME, entry.key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} stale cache entries`);
  }

  return deletedCount;
};
