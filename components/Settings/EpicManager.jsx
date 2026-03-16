import { useState } from 'react';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit3, Trash2, Check, X, Layers } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#64748b',
];

export default function EpicManager({ boardId }) {
  const { epics, addEpic, updateEpic, deleteEpic } = useTask();
  const { currentBoard } = useBoard();
  const { user } = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEpic, setNewEpic] = useState({ name: '', description: '', color: PRESET_COLORS[0], startDate: '', dueDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(null);

  // Filter epics for this board
  const boardEpics = epics.filter((e) => e.boardId === boardId);

  const handleAdd = async () => {
    if (!newEpic.name.trim()) return;
    setIsAdding(true);
    setError('');
    try {
      await addEpic({
        ...newEpic,
        boardId,
        createdBy: user?.email,
      });
      setNewEpic({ name: '', description: '', color: PRESET_COLORS[0], startDate: '', dueDate: '' });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add epic. Please try again.');
      console.error('Error adding epic:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditStart = (epic) => {
    setEditingId(epic.epicId);
    setEditingValues({
      name: epic.name,
      description: epic.description || '',
      color: epic.color || PRESET_COLORS[0],
      startDate: epic.startDate || '',
      dueDate: epic.dueDate || '',
    });
  };

  const handleEditSave = async (epic) => {
    if (!editingValues.name.trim()) {
      setEditingId(null);
      return;
    }
    setIsSaving(epic.epicId);
    setError('');
    try {
      await updateEpic({ ...epic, ...editingValues });
      setEditingId(null);
    } catch (err) {
      setError('Failed to update epic. Please try again.');
      console.error('Error updating epic:', err);
    } finally {
      setIsSaving(null);
    }
  };

  const handleDelete = async (epic) => {
    if (!window.confirm(`Delete epic "${epic.name}"? Tasks linked to this epic will keep their epicId but the epic will no longer exist.`)) return;
    setIsDeleting(epic.epicId);
    setError('');
    try {
      await deleteEpic(epic);
    } catch (err) {
      setError('Failed to delete epic. Please try again.');
      console.error('Error deleting epic:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            Epics
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Epic
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Epic List */}
        {boardEpics.length > 0 ? (
          <div className="space-y-3">
            {boardEpics.map((epic) => {
              const isEditing = editingId === epic.epicId;
              return (
                <div
                  key={epic.epicId}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 group hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
                >
                  {/* Color dot */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: isEditing ? editingValues.color : (epic.color || '#6b7280') }}
                  />

                  {isEditing ? (
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingValues.name}
                          onChange={(e) => setEditingValues((v) => ({ ...v, name: e.target.value }))}
                          placeholder="Epic name"
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        {/* Color picker */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowColorPicker(showColorPicker === epic.epicId ? null : epic.epicId)}
                            className="px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                          >
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ backgroundColor: editingValues.color }} />
                          </button>
                          {showColorPicker === epic.epicId && (
                            <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-600 z-20">
                              <div className="grid grid-cols-5 gap-2">
                                {PRESET_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => { setEditingValues((v) => ({ ...v, color: c })); setShowColorPicker(null); }}
                                    className="w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c, borderColor: editingValues.color === c ? '#000' : 'transparent' }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={editingValues.description}
                        onChange={(e) => setEditingValues((v) => ({ ...v, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editingValues.startDate}
                            onChange={(e) => setEditingValues((v) => ({ ...v, startDate: e.target.value }))}
                            className="px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editingValues.dueDate}
                            onChange={(e) => setEditingValues((v) => ({ ...v, dueDate: e.target.value }))}
                            className="px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(epic)}
                          disabled={isSaving === epic.epicId}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          {isSaving === epic.epicId ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-slate-500 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-md text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{epic.name}</div>
                      {epic.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{epic.description}</p>
                      )}
                      {(epic.startDate || epic.dueDate) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {epic.startDate && `Start: ${epic.startDate}`}
                          {epic.startDate && epic.dueDate && ' · '}
                          {epic.dueDate && `Due: ${epic.dueDate}`}
                        </p>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleEditStart(epic)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                        title="Edit epic"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(epic)}
                        disabled={isDeleting === epic.epicId}
                        className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                        title="Delete epic"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No epics yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Epics help you group related tasks. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Add New Epic Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">New Epic</h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newEpic.name}
                onChange={(e) => setNewEpic((v) => ({ ...v, name: e.target.value }))}
                placeholder="Epic name (e.g., User Authentication)"
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(showColorPicker === 'new' ? null : 'new')}
                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" style={{ backgroundColor: newEpic.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Color</span>
                </button>
                {showColorPicker === 'new' && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-slate-600 z-20">
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setNewEpic((v) => ({ ...v, color: c })); setShowColorPicker(null); }}
                          className="w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c, borderColor: newEpic.color === c ? '#000' : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <textarea
              value={newEpic.description}
              onChange={(e) => setNewEpic((v) => ({ ...v, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newEpic.startDate}
                  onChange={(e) => setNewEpic((v) => ({ ...v, startDate: e.target.value }))}
                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newEpic.dueDate}
                  onChange={(e) => setNewEpic((v) => ({ ...v, dueDate: e.target.value }))}
                  className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={isAdding || !newEpic.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                {isAdding ? 'Creating...' : 'Create Epic'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewEpic({ name: '', description: '', color: PRESET_COLORS[0], startDate: '', dueDate: '' }); }}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
