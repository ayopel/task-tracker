import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, ExternalLink, Users } from 'lucide-react';
import { useBoard } from '../../context/BoardContext';
import Badge from '../common/Badge';

export default function BoardCard({ board }) {
  const navigate = useNavigate();
  const { deleteBoard } = useBoard();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleNavigate = () => {
    navigate(`/board/${board.id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBoard(board.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete board:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // boards from mapBoardFile use 'ownership' not 'isOwner', and modifiedTime/createdTime not updatedAt/createdAt
  const isOwner = board.isOwner ?? (board.ownership === 'owned');
  const canDelete = isOwner && board.canEdit;

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
        onClick={handleNavigate}
      >
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {board.name}
            </h3>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
                title="Delete board"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Badges and Info */}
          <div className="flex items-center justify-between mb-4">
            <Badge
              variant={isOwner ? 'success' : 'info'}
              icon={isOwner ? null : Users}
            >
              {isOwner ? 'Owned' : 'Shared'}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <ExternalLink className="w-3 h-3" />
              <span>Click to open</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
            {board.modifiedTime && (
              <div>
                <span className="font-medium">Modified:</span>{' '}
                {formatDistanceToNow(new Date(board.modifiedTime), { addSuffix: true })}
              </div>
            )}
            {board.createdTime && (
              <div>
                <span className="font-medium">Created:</span>{' '}
                {formatDistanceToNow(new Date(board.createdTime), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {board.collaborators?.length > 0 && (
                <span>{board.collaborators.length} collaborator(s)</span>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete Board?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{board.name}"? This action cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
