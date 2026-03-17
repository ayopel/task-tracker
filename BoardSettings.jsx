import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBoard } from '../../context/BoardContext';
import { useTask } from '../../context/TaskContext';
import StatusConfig from './StatusConfig';
import CategoryManager from './CategoryManager';
import EpicManager from './EpicManager';
import ShareBoardModal from '../Boards/ShareBoardModal';
import { ArrowLeft, Users, Layers, Tag, Settings as SettingsIcon } from 'lucide-react';

export default function BoardSettings() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { boards, currentBoard: ctxBoard, selectBoard } = useBoard();
  const { tasks } = useTask();
  const [activeTab, setActiveTab] = useState('general');
  const [showShareModal, setShowShareModal] = useState(false);
  const [board, setBoard] = useState(null);

  useEffect(() => {
    const found = boards.find((b) => b.id === boardId) || null;
    setBoard(found);
    // Ensure currentBoard is set so TaskContext loads data for this board
    if (found && ctxBoard?.id !== boardId) {
      selectBoard(found);
    }
  }, [boardId, boards]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading board settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'statuses', label: 'Statuses', icon: Layers },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'epics', label: 'Epics', icon: Layers },
    { id: 'members', label: 'Members', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/board/${boardId}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Back to board"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {board.name} Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Created {board.createdTime ? new Date(board.createdTime).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Board Information
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Board Name
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    {board.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    {board.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Created Date
                  </label>
                  <p className="text-base text-gray-900 dark:text-gray-100 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    {board.createdTime
                      ? new Date(board.createdTime).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Board ID
                  </label>
                  <p className="text-base text-gray-500 dark:text-gray-400 px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg font-mono text-sm">
                    {boardId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statuses Tab */}
        {activeTab === 'statuses' && (
          <StatusConfig boardId={boardId} />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <CategoryManager boardId={boardId} />
        )}

        {/* Epics Tab */}
        {activeTab === 'epics' && (
          <EpicManager boardId={boardId} />
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Board Members
                </h2>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Manage Access
                </button>
              </div>

              {board.members && board.members.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {board.members.map((member, index) => (
                    <div key={index} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                            {(member.email || member.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.name || member.email || 'Unknown'}
                          </p>
                          {member.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                        {member.role || 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No members added to this board yet
                  </p>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                  >
                    Add members to get started
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        boardId={boardId}
        boardName={board?.name}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
