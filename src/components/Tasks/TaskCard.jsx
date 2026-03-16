import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTask } from '../../context/TaskContext';
import Badge from '../common/Badge';
import { MessageSquare, Calendar, User, Flag } from 'lucide-react';
import { DEFAULT_CATEGORIES, PRIORITIES } from '../../constants/defaults';

export default function TaskCard({ task, onDragStart }) {
  const navigate = useNavigate();
  const { epics } = useTask();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    if (onDragStart) {
      onDragStart(task);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    if (!e.defaultPrevented) {
      navigate(`/board/${task.boardId}/task/${task.taskId}`);
    }
  };

  // Get category color
  const category = DEFAULT_CATEGORIES.find((c) => c.name === task.categoryId);
  const categoryColor = category?.color || '#6B7280';

  // Get priority info
  const priorityInfo = task.priority
    ? PRIORITIES.find((p) => p.name === task.priority)
    : null;

  // Get epic info
  const epic = task.epicId ? epics.find((e) => e.epicId === task.epicId) : null;

  // Check if due date is overdue
  const isOverdue = task.dueDate
    ? new Date(task.dueDate) < new Date() && task.status !== 'Done'
    : false;

  // Get comment count
  const commentCount = 0; // Will be passed via props or calculated

  // Get assignee initial
  const assigneeInitial = task.assignee
    ? task.assignee.split('@')[0].substring(0, 1).toUpperCase()
    : null;

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3 cursor-pointer transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-50 scale-95 shadow-lg'
          : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Header with task title */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
          {task.header}
        </h4>
      </div>

      {/* Badges section */}
      <div className="mb-3 flex flex-wrap gap-2">
        {/* Epic badge */}
        {epic && (
          <Badge color={epic.color} size="sm">
            {epic.name}
          </Badge>
        )}

        {/* Category badge */}
        {category && (
          <Badge color={categoryColor} size="sm">
            {category.name}
          </Badge>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Priority indicator */}
        {priorityInfo && priorityInfo.name !== 'None' && (
          <Flag
            size={14}
            style={{ color: priorityInfo.color }}
            className="flex-shrink-0"
          />
        )}

        {/* Assignee avatar */}
        {assigneeInitial && (
          <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
            {assigneeInitial}
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              isOverdue
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Calendar size={12} />
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}

        {/* Comment count */}
        {(task.commentCount || 0) > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
            <MessageSquare size={12} />
            {task.commentCount}
          </div>
        )}
      </div>

      {/* Labels if available */}
      {task.labels && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(Array.isArray(task.labels)
            ? task.labels
            : String(task.labels).split(',')
          )
            .filter(Boolean)
            .slice(0, 2)
            .map((label, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {label.trim()}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
