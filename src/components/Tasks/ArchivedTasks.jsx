import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import { ArrowLeft, ArchiveRestore, Search, Inbox } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';

export default function ArchivedTasks() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { boards, currentBoard, selectBoard } = useBoard();
  const { tasks, epics, categories, restoreTask, loading } = useTask();

  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);

  // Ensure currentBoard is set
  useMemo(() => {
    if (!currentBoard && boardId && boards.length > 0) {
      const board = boards.find((b) => b.id === boardId);
      if (board) selectBoard(board);
    }
  }, [boardId, boards, currentBoard, selectBoard]);

  const archivedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.archived && t.boardId === boardId)
      .filter((t) =>
        !search.trim() ||
        t.header.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
      );
  }, [tasks, boardId, search]);

  const handleRestore = async () => {
    if (!confirmTask) return;
    setRestoring(confirmTask.taskId);
    try {
      await restoreTask(confirmTask);
    } catch (err) {
      console.error('Restore failed:', err);
    } finally {
      setRestoring(null);
      setConfirmTask(null);
    }
  };

  const getEpicName = (epicId) =>
    epics.find((e) => e.epicId === epicId)?.name || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/board/${boardId}`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ArrowLeft size={20} />
            Back to Board
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
            Archived Tasks
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived tasks..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : archivedTasks.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search ? 'No archived tasks match your search' : 'No archived tasks'}
            </p>
            {!search && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Archived tasks will appear here
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {archivedTasks.map((task) => {
              const epicName = task.epicId ? getEpicName(task.epicId) : null;
              const labels = Array.isArray(task.labels)
                ? task.labels
                : task.labels
                ? String(task.labels).split(',').map((l) => l.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={task.taskId}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {task.header}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {task.status && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                          {task.status}
                        </span>
                      )}
                      {epicName && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                          {epicName}
                        </span>
                      )}
                      {task.categoryId && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {task.categoryId}
                        </span>
                      )}
                      {labels.map((l) => (
                        <span
                          key={l}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                        >
                          {l}
                        </span>
                      ))}
                      {task.updatedAt && (
                        <span>
                          Archived{' '}
                          {new Date(task.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmTask(task)}
                    disabled={restoring === task.taskId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    title="Restore task"
                  >
                    <ArchiveRestore size={16} />
                    {restoring === task.taskId ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmTask}
        onClose={() => setConfirmTask(null)}
        title="Restore Task"
        message={confirmTask ? `Restore "${confirmTask.header}" back to the board?` : ''}
        confirmLabel="Restore"
        confirmVariant="primary"
        onConfirm={handleRestore}
      />
    </div>
  );
}
