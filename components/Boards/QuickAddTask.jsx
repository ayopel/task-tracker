import { useState, useRef, useEffect } from 'react';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import { useAuth } from '../../context/AuthContext';
import { X, Loader } from 'lucide-react';

export default function QuickAddTask({ status, onClose }) {
  const [header, setHeader] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const { addTask } = useTask();
  const { currentBoard } = useBoard();
  const { user } = useAuth();

  useEffect(() => {
    // Auto-focus the input
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.trim() || !currentBoard) return;

    setIsLoading(true);
    try {
      await addTask({
        header: header.trim(),
        status,
        boardId: currentBoard.id,
        createdBy: user?.email,
      });
      setHeader('');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Add a task to ${status}...`}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 focus:outline-none"
        />
        {isLoading ? (
          <Loader className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        <button
          type="submit"
          disabled={!header.trim() || isLoading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? 'Creating...' : 'Add Task'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
