import { useState } from 'react';
import { useTask } from '../../context/TaskContext';
import TaskCard from '../Tasks/TaskCard';
import QuickAddTask from './QuickAddTask';
import { Plus } from 'lucide-react';
import { DEFAULT_STATUSES } from '../../constants/defaults';

export default function KanbanColumn({
  status,
  tasks,
  onDragStart,
  onDrop,
  isDropTarget,
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Find the color for this status from defaults
  const statusConfig = DEFAULT_STATUSES.find((s) => s.name === status);
  const statusColor = statusConfig?.color || '#6B7280';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(status);
  };

  return (
    <div className="flex-shrink-0 w-96">
      {/* Column Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-8 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {status}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={`Add task to ${status}`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Column Body - Droppable Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`rounded-lg p-4 min-h-[600px] bg-gray-50 dark:bg-gray-900/50 border-2 transition-all ${
          isDropTarget
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
        }`}
      >
        {/* Quick Add Form */}
        {showQuickAdd && (
          <QuickAddTask
            status={status}
            onClose={() => setShowQuickAdd(false)}
          />
        )}

        {/* Task Cards */}
        <div className="space-y-0">
          {tasks.length === 0 && !showQuickAdd ? (
            <div className="flex items-center justify-center min-h-[400px] text-center">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  No tasks in {status}
                </p>
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add first task
                </button>
              </div>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.taskId}
                task={task}
                onDragStart={onDragStart}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
