import { useState, useEffect } from 'react';
import { useTask } from '../../context/TaskContext';
import { useBoard } from '../../context/BoardContext';
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#64748b',
];

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Urgent'];

export default function CategoryManager({ boardId }) {
  const { tasks } = useTask();
  const { boards, updateBoard } = useBoard();
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const board = boards.find(b => b.id === boardId);

  useEffect(() => {
    // Parse categories from board
    if (board?.categories) {
      try {
        const parsed = JSON.parse(board.categories);
        setCategories(Array.isArray(parsed) ? parsed : []);
      } catch {
        // Initialize with default categories if parsing fails
        const defaultCategories = DEFAULT_CATEGORIES.map((name, index) => ({
          id: `cat_${Date.now()}_${index}`,
          name,
          color: PRESET_COLORS[index % PRESET_COLORS.length],
          isDefault: true,
        }));
        setCategories(defaultCategories);
      }
    } else {
      // Initialize with default categories
      const defaultCategories = DEFAULT_CATEGORIES.map((name, index) => ({
        id: `cat_${Date.now()}_${index}`,
        name,
        color: PRESET_COLORS[index % PRESET_COLORS.length],
        isDefault: true,
      }));
      setCategories(defaultCategories);
    }
  }, [board]);

  const getTaskCountForCategory = (categoryId) => {
    return tasks.filter(t => t.category === categoryId && t.boardId === boardId).length;
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory = {
      id: `cat_${Date.now()}`,
      name: newCategoryName,
      color: newCategoryColor,
      isDefault: false,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryColor(PRESET_COLORS[0]);
  };

  const handleDeleteCategory = (categoryId) => {
    const taskCount = getTaskCountForCategory(categoryId);
    if (taskCount > 0) {
      alert(
        `Cannot delete this category - ${taskCount} task${taskCount !== 1 ? 's' : ''} ${taskCount !== 1 ? 'have' : 'has'} this category assigned. Please reassign them first.`
      );
      return;
    }

    setCategories(categories.filter(c => c.id !== categoryId));
  };

  const handleEditStart = (category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color);
  };

  const handleEditSave = (categoryId) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    setCategories(categories.map(c =>
      c.id === categoryId
        ? { ...c, name: editingName, color: editingColor }
        : c
    ));
    setEditingId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const updatedBoard = {
        ...board,
        categories: JSON.stringify(categories),
      };

      await updateBoard(boardId, updatedBoard);
      setSaveMessage('Categories saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving categories:', error);
      setSaveMessage('Error saving categories. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Categories */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Categories
        </h2>

        {categories.length > 0 ? (
          <div className="space-y-3 mb-6">
            {categories.map((category) => {
              const taskCount = getTaskCountForCategory(category.id);
              const isEditing = editingId === category.id;

              return (
                <div
                  key={category.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 group hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
                >
                  {/* Color Swatch */}
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-gray-300 dark:border-slate-500 cursor-pointer hover:border-gray-400 dark:hover:border-slate-400"
                    style={{ backgroundColor: isEditing ? editingColor : category.color }}
                    onClick={() => setShowColorPicker(isEditing ? null : category.id)}
                    title="Click to change color"
                  />

                  {/* Category Name - Editable */}
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />

                      {/* Color Picker for Edit */}
                      <div className="relative">
                        <button
                          onClick={() => setShowColorPicker(showColorPicker === `edit_${category.id}` ? null : `edit_${category.id}`)}
                          className="px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-md hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded border-2 border-gray-300"
                            style={{ backgroundColor: editingColor }}
                          />
                        </button>

                        {showColorPicker === `edit_${category.id}` && (
                          <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-slate-600 z-20">
                            <div className="grid grid-cols-5 gap-2 mb-3">
                              {PRESET_COLORS.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    setEditingColor(color);
                                    setShowColorPicker(null);
                                  }}
                                  className="w-8 h-8 rounded-lg border-2 hover:border-gray-400 transition-colors"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: editingColor === color ? '#000' : '#ddd',
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Custom:</label>
                              <input
                                type="color"
                                value={editingColor}
                                onChange={(e) => setEditingColor(e.target.value)}
                                className="w-12 h-8 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleEditSave(category.id)}
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </span>
                          {category.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {taskCount} task{taskCount !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Color Picker for View */}
                      {showColorPicker === category.id && (
                        <div className="absolute bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-slate-600 z-20">
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  setCategories(categories.map(c =>
                                    c.id === category.id ? { ...c, color } : c
                                  ));
                                  setShowColorPicker(null);
                                }}
                                className="w-8 h-8 rounded-lg border-2 hover:border-gray-400 transition-colors"
                                style={{
                                  backgroundColor: color,
                                  borderColor: category.color === color ? '#000' : '#ddd',
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 dark:text-gray-400">Custom:</label>
                            <input
                              type="color"
                              value={category.color}
                              onChange={(e) => {
                                setCategories(categories.map(c =>
                                  c.id === category.id ? { ...c, color: e.target.value } : c
                                ));
                              }}
                              className="w-12 h-8 rounded cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Edit Button */}
                  {!isEditing && !category.isDefault && (
                    <button
                      onClick={() => handleEditStart(category)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit category"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {!isEditing && !category.isDefault && (
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">
            No categories configured yet
          </p>
        )}
      </div>

      {/* Add New Category */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Add New Category
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Category name (e.g., Bug Fix)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(showColorPicker === 'new' ? null : 'new')}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: newCategoryColor }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Color</span>
              </button>

              {showColorPicker === 'new' && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-slate-600 z-20">
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setNewCategoryColor(color);
                          setShowColorPicker(null);
                        }}
                        className="w-8 h-8 rounded-lg border-2 hover:border-gray-400 transition-colors"
                        style={{
                          backgroundColor: color,
                          borderColor: newCategoryColor === color ? '#000' : '#ddd',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Custom:</label>
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-12 h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Category</span>
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
