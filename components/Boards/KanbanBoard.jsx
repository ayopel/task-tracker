import { useState, useMemo } from 'react';
import { useTask } from '../../context/TaskContext';
import KanbanColumn from './KanbanColumn';
import { DEFAULT_STATUSES } from '../../constants/defaults';

export default function KanbanBoard({ filters = {} }) {
  const { tasks, settings, updateTask } = useTask();
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedFromStatus, setDraggedFromStatus] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get status flow from settings or use defaults
  const statusFlow = useMemo(() => {
    if (settings?.statusFlow) {
      return settings.statusFlow
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return DEFAULT_STATUSES.map((s) => s.name);
  }, [settings]);

  // Filter tasks based on active filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.assignee && filters.assignee !== 'All') {
        if (!task.assignee || !task.assignee.includes(filters.assignee)) {
          return false;
        }
      }
      if (filters.epic && filters.epic !== 'All') {
        if (task.epicId !== filters.epic) {
          return false;
        }
      }
      if (filters.category && filters.category !== 'All') {
        if (task.categoryId !== filters.category) {
          return false;
        }
      }
      if (filters.priority && filters.priority !== 'All') {
        if (task.priority !== filters.priority) {
          return false;
        }
      }
      if (filters.status && filters.status !== 'All') {
        if (task.status !== filters.status) {
          return false;
        }
      }
      return !task.archived;
    });
  }, [tasks, filters]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped = {};
    statusFlow.forEach((status) => {
      grouped[status] = [];
    });

    filteredTasks.forEach((task) => {
      if (grouped[task.status] !== undefined) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, statusFlow]);

  const handleDragStart = (task) => {
    setDraggedTaskId(task.taskId);
    setDraggedFromStatus(task.status);
  };

  const handleDrop = async (targetStatus) => {
    if (!draggedTaskId || draggedFromStatus === undefined) return;

    // If dropping in the same status, just cancel
    if (draggedFromStatus === targetStatus) {
      setDraggedTaskId(null);
      setDraggedFromStatus(null);
      setDropTargetStatus(null);
      return;
    }

    const taskToUpdate = filteredTasks.find((t) => t.taskId === draggedTaskId);
    if (!taskToUpdate) return;

    setIsUpdating(true);
    try {
      await updateTask(taskToUpdate, {
        status: targetStatus,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdating(false);
      setDraggedTaskId(null);
      setDraggedFromStatus(null);
      setDropTargetStatus(null);
    }
  };

  const handleDragOver = (status) => {
    if (draggedTaskId && draggedFromStatus !== status) {
      setDropTargetStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDropTargetStatus(null);
  };

  return (
    <div
      className="flex gap-6 overflow-x-auto pb-6 px-6"
      onDragLeave={handleDragLeave}
    >
      {statusFlow.map((status) => (
        <div
          key={status}
          onDragOver={() => handleDragOver(status)}
          onDragLeave={handleDragLeave}
        >
          <KanbanColumn
            status={status}
            tasks={tasksByStatus[status] || []}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            isDropTarget={dropTargetStatus === status}
          />
        </div>
      ))}
    </div>
  );
}
