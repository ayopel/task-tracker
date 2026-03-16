import { useState, useEffect } from 'react';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import sheetsService from '../../services/sheetsService';
import { Plus, Trash2, Edit3, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#64748b',
];

export default function StatusConfig({ boardId }) {
  const { tasks } = useTask();
  const { boards, updateBoard } = useBoard();
  const [statuses, setStatuses] = useState([]);
  const [statusColors, setStatusColors] = useState({});
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const board = boards.find(b => b.id === boardId);

  useEffect(() => {
    // Parse statuses from Settings sheet "Status Flow"
    if (board?.statusFlow) {
      const statusList = board.statusFlow
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      setStatuses(statusList);

      // Parse status colors from Settings sheet
      const colorMap = {};
      if (board.statusColors) {
        const colors = board.statusColors.split(',').map(c => c.trim());
        statusList.forEach((status, index) => {
          colorMap[status] = colors[index] || PRESET_COLORS[index % PRESET_COLORS.length];
        });
      } else {
        statusList.forEach((status, index) => {
          colorMap[status] = PRESET_COLORS[index % PRESET_COLORS.length];
        });
      }
      setStatusColors(colorMap);
    }
  }, [board]);

  const getTaskCountForStatus = (status) => {
    return tasks.filter(t => t.status === status && t.boardId === boardId).length;
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return;

    const updatedStatuses = [...statuses, newStatusName];
    const updatedColors = {
      ...statusColors,
      [newStatusName]: newStatusColor,
    };

    setStatuses(updatedStatuses);
    setStatusColors(updatedColors);
    setNewStatusName('');
    setNewStatusColor(PRESET_COLORS[0]);
  };

  const handleDeleteStatus = (status) => {
    const taskCount = getTaskCountForStatus(status);
    if (taskCount > 0) {
      alert(
        `Cannot delete "${status}" - ${taskCount} task${taskCount !== 1 ? 's' : ''} ${taskCount !== 1 ? 'have' : 'has'} this status. Please reassign them first.`
      );
      return;
    }

    const updatedStatuses = statuses.filter(s => s !== status);
    const updatedColors = { ...statusColors };
    delete updatedColors[status];

    setStatuses(updatedStatuses);
    setStatusColors(updatedColors);
  };

  const handleEditStart = (status) => {
    setEditingId(status);
    setEditingName(status);
  };

  const handleEditSave = (oldStatus) => {
    if (!editingName.trim() || editingName === oldStatus) {
      setEditingId(null);
      return;
    }

    const updatedStatuses = statuses.map(s => s === oldStatus ? editingName : s);
    const updatedColors = { ...statusColors };
    updatedColors[editingName] = updatedColors[oldStatus];
    delete updatedColors[oldStatus];

    setStatuses(updatedStatuses);
    setStatusColors(updatedColors);
    setEditingId(null);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newStatuses = [...statuses];
    [newStatuses[index - 1], newStatuses[index]] = [newStatuses[index], newStatuses[index - 1]];
    setStatuses(newStatuses);
  };

  const handleMoveDown = (index) => {
    if (index === statuses.length - 1) return;
    const newStatuses = [...statuses];
    [newStatuses[index], newStatuses[index + 1]] = [newStatuses[index + 1], newStatuses[index]];
    setStatuses(newStatuses);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const statusFlow = statuses.join(', ');
      const statusColorsArray = statuses.map(s => statusColors[s]);
      const statusColorsStr = statusColorsArray.join(', ');

      // Update board with new status flow and colors
      const updatedBoard = {
        ...board,
        statusFlow,
        statusColors: statusColorsStr,
      };

      await updateBoard(boardId, updatedBoard);
      setSaveMessage('Status configuration saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving status configuration:', error);
      setSaveMessage('Error saving configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Statuses */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Status Flow
        </h2>

        {statuses.length > 0 ? (
          <div className="space-y-3 mb-6">
            {statuses.map((status, index) => (
              <div
                key={status}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 group hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
              >
                {/* Color Swatch */}
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-gray-300 dark:border-slate-500 cursor-pointer hover:border-gray-400 dark:hover:border-slate-400"
                  style={{ backgroundColor: statusColors[status] || PRESET_COLORS[0] }}
                  onClick={() => {
                    handleEditStart(status);
                    setShowColorPicker(status);
                  }}
                  title="Click to change color"
                />

                {/* Status Name - Editable */}
                {editingId === status ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditSave(status)}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors text-green-600 dark:text-green-400"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-medium text-gray-900 dark:text-white">
                      {status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-600 px-2 py-1 rounded">
                      {getTaskCountForStatus(status)} task{getTaskCountForStatus(status) !== 1 ? 's' : ''}
                    </span>
                  </>
                )}

                {/* Color Picker - Inline */}
                {showColorPicker === status && editingId === status && (
                  <div className="absolute bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-slate-600 z-20">
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setStatusColors({
                              ...statusColors,
                              [status]: color,
                            });
                            setShowColorPicker(false);
                          }}
                          className="w-8 h-8 rounded-lg border-2 hover:border-gray-400 transition-colors"
                          style={{
                            backgroundColor: color,
                            borderColor: statusColors[status] === color ? '#000' : '#ddd',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">Custom:</label>
                      <input
                        type="color"
                        value={statusColors[status] || PRESET_COLORS[0]}
                        onChange={(e) => {
                          setStatusColors({
                            ...statusColors,
                            [status]: e.target.value,
                          });
                        }}
                        className="w-12 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                {editingId !== status && (
                  <button
                    onClick={() => handleEditStart(status)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit status name"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {/* Move Up Button */}
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                {/* Move Down Button */}
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === statuses.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteStatus(status)}
                  className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete status"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">
            No statuses configured yet
          </p>
        )}
      </div>

      {/* Add New Status */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Add New Status
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Status name (e.g., In Review)"
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddStatus()}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: newStatusColor }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Color</span>
              </button>

              {showColorPicker && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-slate-600 z-20">
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setNewStatusColor(color);
                          setShowColorPicker(false);
                        }}
                        className="w-8 h-8 rounded-lg border-2 hover:border-gray-400 transition-colors"
                        style={{
                          backgroundColor: color,
                          borderColor: newStatusColor === color ? '#000' : '#ddd',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Custom:</label>
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="w-12 h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAddStatus}
              disabled={!newStatusName.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {saveMessage && (
            <p className={`text-sm font-medium ${
              saveMessage.includes('Error')
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              {saveMessage}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
