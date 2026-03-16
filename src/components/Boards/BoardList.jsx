import { useState, useMemo } from 'react';
import { useBoard } from '../../context/BoardContext';
import BoardCard from './BoardCard';
import CreateBoardModal from './CreateBoardModal';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { Plus, Search, RefreshCw, LayoutGrid } from 'lucide-react';

export default function BoardList() {
  const {
    boards,
    isLoading: loading,
    loadBoards: refreshBoards,
  } = useBoard();

  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // all, owned, shared
  const [sortBy, setSortBy] = useState('modified-desc'); // modified-desc, name-asc, created-desc
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter boards
  const filtered = useMemo(() => {
    let result = boards || [];

    // Search filter
    if (searchTerm) {
      result = result.filter(board =>
        board.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ownership filter (board.ownership is 'owned' or 'shared' from mapBoardFile)
    if (ownershipFilter === 'owned') {
      result = result.filter(board => (board.ownership === 'owned') || board.isOwner);
    } else if (ownershipFilter === 'shared') {
      result = result.filter(board => (board.ownership === 'shared') && !board.isOwner);
    }

    return result;
  }, [boards, searchTerm, ownershipFilter]);

  // Sort boards
  const sorted = useMemo(() => {
    const copy = [...filtered];

    switch (sortBy) {
      case 'name-asc':
        copy.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created-desc':
        copy.sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));
        break;
      case 'modified-desc':
      default:
        copy.sort((a, b) => new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0));
        break;
    }

    return copy;
  }, [filtered, sortBy]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Boards
              </h1>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Board</span>
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="owned">My Boards</option>
              <option value="shared">Shared</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="modified-desc">Last Modified</option>
              <option value="name-asc">Name</option>
              <option value="created-desc">Created Date</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={refreshBoards}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh boards"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sorted.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'No boards found' : 'No boards yet'}
            description={
              searchTerm
                ? 'Try adjusting your search or filters'
                : 'Create your first board to get started'
            }
            action={{
              label: 'Create Board',
              onClick: () => setIsCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(board => (
              <BoardCard
                key={board.id}
                board={board}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pull to Refresh Hint (Mobile) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4">
        <button
          onClick={refreshBoards}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Pull to refresh
        </button>
      </div>

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
