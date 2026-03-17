import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBoard } from '../../context/BoardContext';
import { useTask } from '../../context/TaskContext';
import KanbanBoard from './KanbanBoard';
import ShareBoardModal from './ShareBoardModal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  Settings,
  Share2,
  Plus,
  Filter,
  ChevronLeft,
  AlertCircle,
  Archive,
} from 'lucide-react';

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { boards, selectBoard, currentBoard } = useBoard();
  const { tasks, epics, categories, loading, error, refreshBoardData } =
    useTask();

  // Filter state
  const [filters, setFilters] = useState({
    assignee: 'All',
    epic: 'All',
    category: 'All',
    priority: 'All',
    status: 'All',
  });

  const [showShareModal, setShowShareModal] = useState(false);

  // Load board on mount
  useEffect(() => {
    if (!boardId) return;

    const board = boards.find((b) => b.id === boardId);
    if (board) {
      selectBoard(board);
    } else if (boards.length > 0) {
      // Board not found in list
      navigate('/');
    }
  }, [boardId, boards, selectBoard, navigate]);

  if (!currentBoard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Board not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The board you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading board..." />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Error loading board
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => refreshBoardData()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Extract unique assignees, epics, categories, and priorities from tasks
  const uniqueAssignees = Array.from(
    new Set(tasks.filter((t) => t.assignee).map((t) => t.assignee))
  ).sort();
  // Epics: keep full objects so we can use epicId as filter value but show name
  const boardEpics = epics.filter((e) => e.epicId && e.name);
  const uniqueCategories = Array.from(
    new Set(categories.map((c) => c.name || c.categoryId).filter(Boolean))
  ).sort();
  const uniquePriorities = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-4 space-y-4">
          {/* Top row - Navigation and title */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to boards"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currentBoard.name}
              </h1>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/board/${boardId}/archived`)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View archived tasks"
              >
                <Archive className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">
                  Archive
                </span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Share board"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">
                  Share
                </span>
              </button>

              <button
                onClick={() => navigate(`/board/${boardId}/settings`)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Board settings"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">
                  Settings
                </span>
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />

            {/* Assignee filter */}
            <select
              value={filters.assignee}
              onChange={(e) =>
                setFilters({ ...filters, assignee: e.target.value })
              }
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Assignees</option>
              {uniqueAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee.split('@')[0]}
                </option>
              ))}
            </select>

            {/* Epic filter */}
            <select
              value={filters.epic}
              onChange={(e) => setFilters({ ...filters, epic: e.target.value })}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Epics</option>
              {boardEpics.map((epic) => (
                <option key={epic.epicId} value={epic.epicId}>
                  {epic.name}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              {uniquePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>

            {/* Reset filters button */}
            {Object.values(filters).some((f) => f !== 'All') && (
              <button
                onClick={() =>
                  setFilters({
                    assignee: 'All',
                    epic: 'All',
                    category: 'All',
                    priority: 'All',
                    status: 'All',
                  })
                }
                className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content - Kanban board */}
      <div className="flex-1 overflow-x-auto bg-gray-50 dark:bg-gray-900/50">
        <KanbanBoard filters={filters} />
      </div>

      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        boardId={boardId}
        boardName={currentBoard?.name}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
