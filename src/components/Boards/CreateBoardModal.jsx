import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoard } from '../../context/BoardContext';
import Modal from '../common/Modal';
import { Plus } from 'lucide-react';

export default function CreateBoardModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { createBoard } = useBoard();
  const [boardName, setBoardName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!boardName.trim()) {
      setError('Board name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newBoard = await createBoard({ name: boardName.trim() });
      setBoardName('');
      onClose();
      navigate(`/board/${newBoard.spreadsheetId}`);
    } catch (err) {
      setError(err.message || 'Failed to create board');
      console.error('Error creating board:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setBoardName('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Board"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Board Name Input */}
        <div>
          <label
            htmlFor="board-name"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            Board Name
          </label>
          <input
            id="board-name"
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Enter board name..."
            maxLength={100}
            disabled={isLoading}
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {boardName.length}/100 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !boardName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            {isLoading ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
