import { useState } from 'react';
import { useTask } from '../../context/TaskContext';
import { useNavigate } from 'react-router-dom';
import { RELATIONSHIP_TYPES } from '../../constants/defaults';
import { Link2, Plus, X, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';

export default function TaskRelationships({ taskId }) {
  const navigate = useNavigate();
  const {
    tasks,
    getTaskRelationships,
    addRelationship,
    deleteRelationship,
  } = useTask();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState('relates-to');
  const [selectedTask, setSelectedTask] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSuggestions, setTaskSuggestions] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);

  const relationships = getTaskRelationships(taskId);

  // Update task suggestions
  const handleTaskSearch = (query) => {
    setTaskSearch(query);
    if (query.trim()) {
      const filtered = tasks.filter(
        (t) =>
          t.taskId !== taskId &&
          (t.header.toLowerCase().includes(query.toLowerCase()) ||
            t.taskId.toLowerCase().includes(query.toLowerCase()))
      );
      setTaskSuggestions(filtered.slice(0, 10));
    } else {
      setTaskSuggestions([]);
    }
  };

  const handleAddRelationship = async () => {
    if (!selectedTask) return;

    try {
      await addRelationship({
        fromTaskId: taskId,
        toTaskId: selectedTask,
        type: selectedType,
      });
      setSelectedTask('');
      setTaskSearch('');
      setShowAddForm(false);
      setTaskSuggestions([]);
    } catch (error) {
      console.error('Error adding relationship:', error);
    }
  };

  const handleDeleteRelationship = async (relationshipId) => {
    try {
      const rel = relationships.find((r) => r.relationId === relationshipId);
      await deleteRelationship(rel);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error('Error deleting relationship:', error);
    }
  };

  // Get related task info
  const getRelatedTask = (rel) => {
    const linkedTaskId =
      rel.fromTaskId === taskId ? rel.toTaskId : rel.fromTaskId;
    return tasks.find((t) => t.taskId === linkedTaskId);
  };

  // Get relationship label (considers direction)
  const getRelationshipLabel = (rel) => {
    const relationshipType = RELATIONSHIP_TYPES.find((rt) => rt.value === rel.type);
    if (!relationshipType) return rel.type;

    if (rel.fromTaskId === taskId) {
      return relationshipType.label;
    } else {
      return relationshipType.inverse || relationshipType.label;
    }
  };

  // Group relationships by type/inverse
  const groupedRelationships = {};
  relationships.forEach((rel) => {
    const label = getRelationshipLabel(rel);
    if (!groupedRelationships[label]) {
      groupedRelationships[label] = [];
    }
    groupedRelationships[label].push(rel);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={18} className="text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Relationships
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="ml-auto flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Add relationship form */}
      {showAddForm && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-6 bg-gray-50 dark:bg-gray-700/50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Relationship Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Task
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => handleTaskSearch(e.target.value)}
                  placeholder="Search tasks by name or ID"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {taskSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {taskSuggestions.map((task) => (
                      <button
                        key={task.taskId}
                        onClick={() => {
                          setSelectedTask(task.taskId);
                          setTaskSearch(task.header);
                          setTaskSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium line-clamp-1">
                          {task.header}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {task.taskId}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddRelationship}
                disabled={!selectedTask}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Add Relationship
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedTask('');
                  setTaskSearch('');
                  setTaskSuggestions([]);
                }}
                className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relationships list */}
      {Object.keys(groupedRelationships).length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
          No relationships yet
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRelationships).map(([label, rels]) => (
            <div key={label}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {label}
              </h3>
              <div className="space-y-2 ml-4">
                {rels.map((rel) => {
                  const relatedTask = getRelatedTask(rel);
                  return (
                    <div
                      key={rel.relationId}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <button
                        onClick={() =>
                          navigate(
                            `/board/${relatedTask?.boardId}/task/${relatedTask?.id}`
                          )
                        }
                        className="flex-1 text-left text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium line-clamp-1"
                        title={relatedTask?.header}
                      >
                        {relatedTask?.header || 'Unknown task'}
                      </button>
                      <button
                        onClick={() => setShowDeleteDialog(rel.relationId)}
                        className="ml-2 p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove relationship"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        title="Remove Relationship"
        message="Are you sure you want to remove this relationship?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => handleDeleteRelationship(showDeleteDialog)}
      />
    </div>
  );
}
