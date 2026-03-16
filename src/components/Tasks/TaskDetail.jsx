import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import { useAuth } from '../../context/AuthContext';
import TaskComments from './TaskComments';
import TaskRelationships from './TaskRelationships';
import Badge from '../common/Badge';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Flag,
  AlignLeft,
  Layers,
  Link2,
  MessageSquare,
  Archive,
  Clock,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_STATUSES,
  PRIORITIES,
} from '../../constants/defaults';
import ReactMarkdown from 'react-markdown';

export default function TaskDetail() {
  const { boardId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { boards, currentBoard, selectBoard } = useBoard();

  // Ensure currentBoard is set when navigating directly to a task URL
  useEffect(() => {
    if (!currentBoard && boardId && boards.length > 0) {
      const board = boards.find((b) => b.id === boardId);
      if (board) selectBoard(board);
    }
  }, [boardId, boards, currentBoard, selectBoard]);
  const {
    getTaskById,
    epics,
    categories,
    labels: allLabels,
    members,
    updateTask,
    archiveTask,
    loading,
  } = useTask();

  const task = useMemo(() => getTaskById(taskId), [taskId, getTaskById]);

  const [isEditing, setIsEditing] = useState({});
  const [editValues, setEditValues] = useState({ labels: [], status: '', priority: 'None', categoryId: '', epicId: '', assignee: '', dueDate: '', storyPoints: '', header: '', description: '' });
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [memberInput, setMemberInput] = useState('');
  const [memberSuggestions, setMemberSuggestions] = useState([]);

  // Initialize edit values
  useEffect(() => {
    if (task) {
      setEditValues({
        header: task.header || '',
        description: task.description || '',
        status: task.status || DEFAULT_STATUSES[0].name,
        priority: task.priority || 'None',
        categoryId: task.categoryId || '',
        labels: Array.isArray(task.labels)
          ? task.labels
          : task.labels
          ? String(task.labels).split(',').map((l) => l.trim())
          : [],
        epicId: task.epicId || '',
        assignee: task.assignee || '',
        dueDate: task.dueDate || '',
        storyPoints: task.storyPoints || '',
      });
    }
  }, [task]);

  // Update tag suggestions
  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = allLabels.filter((label) =>
        label.name.toLowerCase().includes(tagInput.toLowerCase())
      );
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  }, [tagInput, allLabels]);

  // Update member suggestions
  useEffect(() => {
    if (memberInput.trim()) {
      const filtered = members.filter((member) =>
        member.email.toLowerCase().includes(memberInput.toLowerCase())
      );
      setMemberSuggestions(filtered);
    } else {
      setMemberSuggestions([]);
    }
  }, [memberInput, members]);

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Task not found
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const handleFieldChange = async (field, value) => {
    try {
      setEditValues((prev) => ({ ...prev, [field]: value }));
      await updateTask(task, { [field]: value });
      setIsEditing((prev) => ({ ...prev, [field]: false }));
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const handleLabelAdd = (label) => {
    const labelName =
      typeof label === 'string' ? label : label.name;
    const newLabels = [...editValues.labels];
    if (!newLabels.includes(labelName)) {
      newLabels.push(labelName);
      handleFieldChange('labels', newLabels);
    }
    setTagInput('');
  };

  const handleLabelRemove = (labelToRemove) => {
    const newLabels = editValues.labels.filter((l) => l !== labelToRemove);
    handleFieldChange('labels', newLabels);
  };

  const handleMemberSelect = (member) => {
    handleFieldChange('assignee', member.email);
    setMemberInput('');
    setShowMemberSuggestions(false);
  };

  const handleArchive = async () => {
    if (!task || !task.rowIndex) {
      console.error('Cannot archive: task or rowIndex missing');
      setShowArchiveDialog(false);
      return;
    }
    try {
      await archiveTask(task);
      navigate(-1);
    } catch (error) {
      console.error('Error archiving task:', error);
      setShowArchiveDialog(false);
    }
  };

  const categoryName = editValues.categoryId;
  const epicName = editValues.epicId
    ? epics.find((e) => e.epicId === editValues.epicId)?.name
    : null;

  // Get member display name
  const assigneeMember = members.find((m) => m.email === editValues.assignee);
  const assigneeDisplay = assigneeMember?.displayName || editValues.assignee;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1 text-center">
            Task Details
          </h1>
          <button
            onClick={() => setShowArchiveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Archive size={18} />
            <span className="text-sm">Archive</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              {isEditing.header ? (
                <input
                  type="text"
                  autoFocus
                  value={editValues.header}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      header: e.target.value,
                    }))
                  }
                  onBlur={() =>
                    handleFieldChange('header', editValues.header)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldChange('header', editValues.header);
                    }
                  }}
                  className="w-full text-3xl font-bold text-gray-900 dark:text-gray-100 border-b-2 border-blue-500 focus:outline-none"
                />
              ) : (
                <h1
                  onClick={() => setIsEditing((prev) => ({ ...prev, header: true }))}
                  className="text-3xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {editValues.header}
                </h1>
              )}
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlignLeft size={18} className="text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Description
                </h2>
              </div>
              {isEditing.description ? (
                <div className="space-y-3">
                  <textarea
                    autoFocus
                    value={editValues.description}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description (supports Markdown)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleFieldChange('description', editValues.description)
                      }
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditValues((prev) => ({
                          ...prev,
                          description: task.description || '',
                        }));
                        setIsEditing((prev) => ({
                          ...prev,
                          description: false,
                        }));
                      }}
                      className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() =>
                    setIsEditing((prev) => ({ ...prev, description: true }))
                  }
                  className="prose dark:prose-invert max-w-none cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {editValues.description ? (
                    <ReactMarkdown>{editValues.description}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No description
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Status, Priority, Category */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_STATUSES.map((status) => (
                    <button
                      key={status.name}
                      onClick={() => handleFieldChange('status', status.name)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        editValues.status === status.name
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={
                        editValues.status === status.name
                          ? { backgroundColor: status.color }
                          : {}
                      }
                    >
                      {status.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={editValues.priority}
                  onChange={(e) =>
                    handleFieldChange('priority', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={editValues.categoryId}
                  onChange={(e) =>
                    handleFieldChange('categoryId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {categories.length === 0 ? 'No categories — add in Settings' : 'Select a category'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  {/* Show current value as fallback if it's not in the list */}
                  {editValues.categoryId &&
                    !categories.some((c) => c.name === editValues.categoryId) && (
                    <option value={editValues.categoryId}>
                      {editValues.categoryId} (not found)
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Labels */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Labels
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(editValues.labels || []).map((label) => (
                  <div
                    key={label}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded-full text-sm flex items-center gap-2"
                  >
                    {label}
                    <button
                      onClick={() => handleLabelRemove(label)}
                      className="hover:text-blue-600 dark:hover:text-blue-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      handleLabelAdd(tagInput.trim());
                    }
                  }}
                  placeholder="Add or create labels"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                    {tagSuggestions.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => handleLabelAdd(label)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100"
                      >
                        {label.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Epic */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Epic
              </label>
              <select
                value={editValues.epicId}
                onChange={(e) => handleFieldChange('epicId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {epics.length === 0 ? 'No epics — create one first' : 'Select an epic'}
                </option>
                {epics.map((epic) => (
                  <option key={epic.epicId} value={epic.epicId}>
                    {epic.name}
                  </option>
                ))}
                {/* Show current value as fallback if it's not in the list */}
                {editValues.epicId &&
                  !epics.some((e) => e.epicId === editValues.epicId) && (
                  <option value={editValues.epicId}>
                    {editValues.epicId} (not found)
                  </option>
                )}
              </select>
            </div>

            {/* Relationships section */}
            <TaskRelationships taskId={taskId} />

            {/* Comments section */}
            <TaskComments taskId={taskId} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Assignee */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignee
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onFocus={() => setShowMemberSuggestions(true)}
                  placeholder="Search members"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {showMemberSuggestions && memberSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                    {memberSuggestions.map((member) => (
                      <button
                        key={member.email}
                        onClick={() => handleMemberSelect(member)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium flex items-center justify-center">
                          {member.email.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {member.email}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {editValues.assignee && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium flex items-center justify-center">
                      {editValues.assignee.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {assigneeDisplay}
                    </span>
                  </div>
                  <button
                    onClick={() => handleFieldChange('assignee', '')}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={editValues.dueDate}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Story Points */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                value={editValues.storyPoints}
                onChange={(e) =>
                  handleFieldChange('storyPoints', e.target.value)
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Created by
                </p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">
                  {task.createdBy}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Created
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {task.createdAt
                    ? format(new Date(task.createdAt), 'PPpp')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide mb-1">
                  Last updated
                </p>
                <p className="text-gray-900 dark:text-gray-100">
                  {task.updatedAt
                    ? format(new Date(task.updatedAt), 'PPpp')
                    : 'N/A'}
                </p>
                {task.updatedBy && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    by {task.updatedBy}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive dialog */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        title="Archive Task"
        message="Are you sure you want to archive this task? It can be restored later."
        confirmLabel="Archive"
        confirmVariant="danger"
        onConfirm={handleArchive}
      />
    </div>
  );
}
