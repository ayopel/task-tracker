// src/constants/defaults.js

export const DEFAULT_STATUSES = [
  { name: 'To Do', color: '#6B7280' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'In Review', color: '#F59E0B' },
  { name: 'Done', color: '#10B981' },
];

export const DEFAULT_CATEGORIES = [
  { name: 'Bug', color: '#EF4444' },
  { name: 'Feature', color: '#3B82F6' },
  { name: 'Improvement', color: '#8B5CF6' },
  { name: 'Chore', color: '#6B7280' },
  { name: 'Documentation', color: '#14B8A6' },
  { name: 'Research', color: '#F59E0B' },
];

export const PRIORITIES = [
  { name: 'None', color: '#D1D5DB', icon: '' },
  { name: 'Low', color: '#60A5FA', icon: '↓' },
  { name: 'Medium', color: '#FBBF24', icon: '→' },
  { name: 'High', color: '#F97316', icon: '↑' },
  { name: 'Critical', color: '#EF4444', icon: '⚡' },
];

export const RELATIONSHIP_TYPES = [
  { value: 'subtask', label: 'Subtask of', inverse: 'Parent of' },
  { value: 'relates-to', label: 'Relates to', inverse: 'Relates to' },
  { value: 'depends-on', label: 'Depends on', inverse: 'Blocks' },
  { value: 'blocks', label: 'Blocks', inverse: 'Depends on' },
];

export const SHEET_TABS = {
  TASKS: 'Tasks',
  EPICS: 'Epics',
  CATEGORIES: 'Categories',
  LABELS: 'Labels',
  COMMENTS: 'Comments',
  RELATIONSHIPS: 'Relationships',
  SETTINGS: 'Settings',
  MEMBERS: 'Members',
};

export const TASK_HEADERS = [
  'taskId', 'boardId', 'epicId', 'header', 'description',
  'categoryId', 'labels', 'status', 'priority', 'dueDate',
  'storyPoints', 'createdBy', 'createdAt', 'assignee',
  'updatedAt', 'updatedBy', 'archived',
];

export const EPIC_HEADERS = [
  'epicId', 'boardId', 'name', 'description', 'color',
  'startDate', 'dueDate', 'createdAt', 'createdBy',
];

export const COMMENT_HEADERS = [
  'commentId', 'taskId', 'boardId', 'body', 'mentions',
  'createdBy', 'createdAt', 'editedAt', 'deleted',
];

export const RELATIONSHIP_HEADERS = [
  'relationId', 'fromTaskId', 'toTaskId', 'type',
  'createdBy', 'createdAt',
];

export const CATEGORY_HEADERS = [
  'categoryId', 'name', 'color', 'isDefault', 'boardId',
];

export const LABEL_HEADERS = [
  'labelId', 'name', 'boardId', 'createdAt',
];

export const MEMBER_HEADERS = [
  'email', 'displayName', 'role', 'photoUrl', 'lastSeen',
];
