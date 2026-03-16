// src/context/TaskContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { useBoard } from './BoardContext';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';
import sheetsService from '../services/sheetsService';

const TaskContext = createContext();

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const { currentBoard } = useBoard();
  const { user } = useAuth();
  const { fetchWithCache, isOffline } = useOffline();

  const [tasks, setTasks] = useState([]);
  const [epics, setEpics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [comments, setComments] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [settings, setSettings] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingCachedData, setUsingCachedData] = useState(false);

  // Load all board data when currentBoard changes
  useEffect(() => {
    if (!currentBoard) {
      setTasks([]);
      setEpics([]);
      setCategories([]);
      setLabels([]);
      setComments([]);
      setRelationships([]);
      setSettings(null);
      setMembers([]);
      setUsingCachedData(false);
      return;
    }

    // Prevent multiple simultaneous loads for the same board
    let cancelled = false;

    const loadBoardData = async () => {
      if (cancelled) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch all data using cache-aware helper
        const { data: batchData, fromCache, isStale } = await fetchWithCache(
          `board_data_${currentBoard.id}`,
          () => sheetsService.getBatchBoardData(currentBoard.id)
        );

        if (cancelled) return;

        setUsingCachedData(fromCache);

        if (fromCache && isStale) {
          console.warn('Using stale cached board data');
        }

        // Sort tasks data by creation date or status
        const sortedTasks = (batchData.tasks || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          if (dateB - dateA !== 0) {
            return dateB - dateA; // Descending order (newest first)
          }

          const modDateA = new Date(a.updatedAt || 0);
          const modDateB = new Date(b.updatedAt || 0);
          return modDateB - modDateA; // Descending order (newest first)
        });

        // Update all state at once
        setTasks(sortedTasks);
        setEpics(batchData.epics || []);
        setCategories(batchData.categories || []);
        setLabels(batchData.labels || []);
        setComments(batchData.comments || []);
        setRelationships(batchData.relationships || []);
        setSettings(batchData.settings || null);
        setMembers(batchData.members || []);
      } catch (error) {
        if (cancelled) return;

        // Check if this is a "not cached while offline" error
        if (error.message?.includes('No cached data available') && !navigator.onLine) {
          console.warn('Board not available offline:', error.message);
          setError('This board is not available offline. Please connect to the internet to view it.');
        } else {
          console.error('Error loading board data:', error);
          setError('Failed to load board data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadBoardData();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [currentBoard?.id, fetchWithCache]);

  // Refresh all board data
  const refreshBoardData = async () => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      const data = await sheetsService.getBatchBoardData(currentBoard.id);

      const sortedTasks = (data.tasks || []).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        if (dateB - dateA !== 0) {
          return dateB - dateA;
        }
        const modDateA = new Date(a.updatedAt || 0);
        const modDateB = new Date(b.updatedAt || 0);
        return modDateB - modDateA;
      });

      setTasks(sortedTasks);
      setEpics(data.epics || []);
      setCategories(data.categories || []);
      setLabels(data.labels || []);
      setComments(data.comments || []);
      setRelationships(data.relationships || []);
      setSettings(data.settings || null);
      setMembers(data.members || []);
    } catch (err) {
      console.error('Error refreshing board data:', err);
      setError('Failed to refresh board data');
    } finally {
      setLoading(false);
    }
  };

  // Add a new task
  const addTask = async (taskData) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      const newTask = await sheetsService.addTask(currentBoard.id, taskData, user?.email);
      await refreshBoardData();
      return newTask;
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing task
  const updateTask = async (task, updatedData) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      const mergedData = { ...task, ...updatedData };
      await sheetsService.updateTask(currentBoard.id, task.rowIndex, mergedData, user?.email);
      await refreshBoardData();
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Archive a task
  const archiveTask = async (task) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.archiveTask(currentBoard.id, task.rowIndex, task, user?.email);
      await refreshBoardData();
    } catch (err) {
      console.error('Error archiving task:', err);
      setError('Failed to archive task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Restore an archived task
  const restoreTask = async (task) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.restoreTask(currentBoard.id, task.rowIndex, task, user?.email);
      await refreshBoardData();
    } catch (err) {
      console.error('Error restoring task:', err);
      setError('Failed to restore task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a comment
  const addComment = async (comment) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      const newComment = await sheetsService.addComment(currentBoard.id, comment, user?.email);
      await refreshBoardData();
      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update a comment
  const updateComment = async (comment) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.updateComment(currentBoard.id, comment.rowIndex, comment, user?.email);
      await refreshBoardData();
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Failed to update comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a comment (soft delete)
  const deleteComment = async (comment) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.deleteComment(currentBoard.id, comment.rowIndex);
      await refreshBoardData();
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a relationship
  const addRelationship = async (rel) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.addRelationship(currentBoard.id, rel);
      await refreshBoardData();
    } catch (err) {
      console.error('Error adding relationship:', err);
      setError('Failed to add relationship');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a relationship
  const deleteRelationship = async (rel) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.deleteRelationship(currentBoard.id, rel.rowIndex);
      await refreshBoardData();
    } catch (err) {
      console.error('Error deleting relationship:', err);
      setError('Failed to delete relationship');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add an epic
  const addEpic = async (epic) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.addEpic(currentBoard.id, epic);
      await refreshBoardData();
    } catch (err) {
      console.error('Error adding epic:', err);
      setError('Failed to add epic');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an epic
  const updateEpic = async (epic) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.updateEpic(currentBoard.id, epic.rowIndex, epic);
      await refreshBoardData();
    } catch (err) {
      console.error('Error updating epic:', err);
      setError('Failed to update epic');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an epic
  const deleteEpic = async (epic) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.deleteEpic(currentBoard.id, epic.rowIndex);
      await refreshBoardData();
    } catch (err) {
      console.error('Error deleting epic:', err);
      setError('Failed to delete epic');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a category
  const addCategory = async (cat) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.addCategory(currentBoard.id, cat);
      await refreshBoardData();
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add a label
  const addLabel = async (label) => {
    if (!currentBoard) return;

    setLoading(true);
    setError(null);
    try {
      await sheetsService.addLabel(currentBoard.id, label);
      await refreshBoardData();
    } catch (err) {
      console.error('Error adding label:', err);
      setError('Failed to add label');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get task by ID
  const getTaskById = (taskId) => {
    return tasks.find(task => task.taskId === taskId);
  };

  // Get comments for a specific task
  const getTaskComments = (taskId) => {
    return comments.filter(
      comment => comment.taskId === taskId && !comment.deleted
    );
  };

  // Get relationships for a specific task
  const getTaskRelationships = (taskId) => {
    return relationships.filter(
      rel => rel.fromTaskId === taskId || rel.toTaskId === taskId
    );
  };

  const value = {
    tasks,
    epics,
    categories,
    labels,
    comments,
    relationships,
    settings,
    members,
    loading,
    error,
    usingCachedData,
    isOffline,
    addTask,
    updateTask,
    archiveTask,
    restoreTask,
    addComment,
    updateComment,
    deleteComment,
    addRelationship,
    deleteRelationship,
    addEpic,
    updateEpic,
    deleteEpic,
    addCategory,
    addLabel,
    refreshBoardData,
    getTaskById,
    getTaskComments,
    getTaskRelationships,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
