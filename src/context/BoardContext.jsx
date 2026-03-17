// src/context/BoardContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import sheetsService from '../services/sheetsService';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';

const BoardContext = createContext(null);

const DEFAULT_BOARD_LIST_PREFERENCES = {
  ownershipFilter: 'all',
  searchTerm: '',
  sortOption: 'modified-desc',
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within BoardProvider');
  }
  return context;
};

export const BoardProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { fetchWithCache, isOffline } = useOffline();
  const [boards, setBoards] = useState([]);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const currentUserEmail = user?.email?.toLowerCase() || null;
  const [boardListPreferences, setBoardListPreferences] = useState(
    DEFAULT_BOARD_LIST_PREFERENCES
  );

  const updateBoardListPreferences = (updates) => {
    setBoardListPreferences((prev) => ({
      ...DEFAULT_BOARD_LIST_PREFERENCES,
      ...prev,
      ...updates,
    }));
  };

  // Load all boards
  const loadBoards = async (options = {}) => {
    if (!isAuthenticated) return;

    const { silent = false } = options;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const { data, fromCache, isStale } = await fetchWithCache(
        'boards',
        () => sheetsService.listBoards()
      );

      setBoards(data);
      setUsingCachedData(fromCache);

      if (fromCache && isStale) {
        console.warn('Using stale cached boards data');
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      // No cache available - boards array stays empty
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Create a new board
  const createBoard = async (boardData) => {
    setIsLoading(true);
    try {
      const newBoard = await sheetsService.createBoard(boardData.name);

      await loadBoards(); // Refresh board list
      return newBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Select a board to work with
  const selectBoard = (board) => {
    if (!board) return;
    setCurrentBoard(board);
    localStorage.setItem('currentBoardId', board.id);
  };

  // Clear current board
  const clearBoard = () => {
    setCurrentBoard(null);
    localStorage.removeItem('currentBoardId');
  };

  // Load boards when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadBoards();
    }
  }, [isAuthenticated]);

  const currentBoardId = currentBoard?.id;

  useEffect(() => {
    if (!currentBoardId) return;
    const updated = boards.find((board) => board.id === currentBoardId);
    if (!updated) return;

    setCurrentBoard((prev) => {
      if (!prev) {
        localStorage.setItem('currentBoardId', updated.id);
        return updated;
      }

      const keysToCompare = [
        'name',
        'ownership',
        'ownerEmail',
        'canEdit',
        'canShare',
        'isShared',
        'modifiedTime',
        'collaborators',
      ];

      const hasDifferences = keysToCompare.some(
        (key) => updated[key] !== prev[key]
      );

      if (hasDifferences) {
        return updated;
      }

      return prev;
    });
  }, [boards, currentBoardId]);

  const shareBoard = async (boardId, email, role = 'writer') => {
    try {
      await sheetsService.shareProjectWithUser(boardId, email, role);
      await loadBoards();
    } catch (error) {
      console.error('Error sharing board from context:', error);
      throw error;
    }
  };

  const fetchCollaborators = async (boardId) => {
    try {
      return await sheetsService.listProjectCollaborators(boardId);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      throw error;
    }
  };

  const removeCollaborator = async (
    boardId,
    permissionId,
    { collaboratorEmail } = {}
  ) => {
    try {
      await sheetsService.removeProjectCollaborator(boardId, permissionId);
      const removedEmail = collaboratorEmail?.toLowerCase();
      const selfRemoval =
        currentUserEmail && removedEmail && removedEmail === currentUserEmail;

      if (selfRemoval) {
        // Self-removal: drop board locally so UI stays in sync without refetch
        setBoards((prev = []) => prev.filter((board) => board.id !== boardId));
        if (currentBoard?.id === boardId) {
          setCurrentBoard(null);
          localStorage.removeItem('currentBoardId');
        }
      } else {
        // Other collaborator removal: refresh board list to update collaborators
        await loadBoards();
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  };

  const deleteBoard = async (boardId) => {
    if (!boardId) return;

    setIsLoading(true);
    try {
      await sheetsService.deleteBoard(boardId);
      setBoards((prev = []) => prev.filter((board) => board.id !== boardId));

      if (currentBoard?.id === boardId) {
        setCurrentBoard(null);
        localStorage.removeItem('currentBoardId');
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get a board by ID from the loaded boards list
  const getBoard = (boardId) => {
    return boards.find((b) => b.id === boardId) || null;
  };

  // Update board settings (writes to the Settings sheet)
  const updateBoard = async (boardId, updatedBoardData) => {
    try {
      await sheetsService.updateBoardSettings(boardId, updatedBoardData);
      await loadBoards({ silent: true });
    } catch (error) {
      console.error('Error updating board:', error);
      throw error;
    }
  };

  const value = {
    boards,
    currentBoard,
    isLoading,
    usingCachedData,
    isOffline,
    boardListPreferences,
    loadBoards,
    createBoard,
    selectBoard,
    clearBoard,
    shareBoard,
    fetchCollaborators,
    removeCollaborator,
    deleteBoard,
    getBoard,
    updateBoard,
    updateBoardListPreferences,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};
