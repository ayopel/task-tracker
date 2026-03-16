import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const mapTaskRow = (row, rowIndex) => {
  return {
    taskId: row[0] || '',
    boardId: row[1] || '',
    epicId: row[2] || '',
    header: row[3] || '',
    description: row[4] || '',
    categoryId: row[5] || '',
    labels: row[6] || '',
    status: row[7] || '',
    priority: row[8] || '',
    dueDate: row[9] || '',
    storyPoints: row[10] ? parseFloat(row[10]) : null,
    createdBy: row[11] || '',
    createdAt: row[12] || '',
    assignee: row[13] || '',
    updatedAt: row[14] || '',
    updatedBy: row[15] || '',
    archived: row[16] === 'TRUE',
    rowIndex: rowIndex + 2,
  };
};

const mapEpicRow = (row, rowIndex) => {
  return {
    epicId: row[0] || '',
    boardId: row[1] || '',
    name: row[2] || '',
    description: row[3] || '',
    color: row[4] || '',
    startDate: row[5] || '',
    dueDate: row[6] || '',
    createdAt: row[7] || '',
    createdBy: row[8] || '',
    rowIndex: rowIndex + 2,
  };
};

const mapCategoryRow = (row, rowIndex) => {
  return {
    categoryId: row[0] || '',
    name: row[1] || '',
    color: row[2] || '',
    isDefault: row[3] === 'TRUE',
    boardId: row[4] || '',
    rowIndex: rowIndex + 2,
  };
};

const mapLabelRow = (row, rowIndex) => {
  return {
    labelId: row[0] || '',
    name: row[1] || '',
    boardId: row[2] || '',
    createdAt: row[3] || '',
    rowIndex: rowIndex + 2,
  };
};

const mapCommentRow = (row, rowIndex) => {
  return {
    commentId: row[0] || '',
    taskId: row[1] || '',
    boardId: row[2] || '',
    body: row[3] || '',
    mentions: row[4] || '',
    createdBy: row[5] || '',
    createdAt: row[6] || '',
    editedAt: row[7] || '',
    deleted: row[8] === 'TRUE',
    rowIndex: rowIndex + 2,
  };
};

const mapRelationshipRow = (row, rowIndex) => {
  return {
    relationId: row[0] || '',
    fromTaskId: row[1] || '',
    toTaskId: row[2] || '',
    type: row[3] || '',
    createdBy: row[4] || '',
    createdAt: row[5] || '',
    rowIndex: rowIndex + 2,
  };
};

const mapMemberRow = (row, rowIndex) => {
  return {
    email: row[0] || '',
    displayName: row[1] || '',
    role: row[2] || '',
    photoUrl: row[3] || '',
    lastSeen: row[4] || '',
    rowIndex: rowIndex + 2,
  };
};

const taskMethods = {
  /**
   * Fetch all board data with a single batchGet request
   */
  async getBatchBoardData(spreadsheetId) {
    const ranges = [
      `${SHEET_TABS.TASKS}!A2:Q10000`,
      `${SHEET_TABS.EPICS}!A2:I1000`,
      `${SHEET_TABS.CATEGORIES}!A2:E100`,
      `${SHEET_TABS.LABELS}!A2:D100`,
      `${SHEET_TABS.COMMENTS}!A2:I10000`,
      `${SHEET_TABS.RELATIONSHIPS}!A2:F1000`,
      `${SHEET_TABS.SETTINGS}!A1:B20`,
      `${SHEET_TABS.MEMBERS}!A2:E100`,
    ].map(r => `ranges=${encodeURIComponent(r)}`).join('&');

    const response = await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${ranges}`
    );

    const valueRanges = response.valueRanges || [];

    const taskRows = valueRanges[0]?.values || [];
    const tasks = taskRows.map((row, idx) => mapTaskRow(row, idx));

    const epicRows = valueRanges[1]?.values || [];
    const epics = epicRows.map((row, idx) => mapEpicRow(row, idx));

    const categoryRows = valueRanges[2]?.values || [];
    const categories = categoryRows.map((row, idx) => mapCategoryRow(row, idx));

    const labelRows = valueRanges[3]?.values || [];
    const labels = labelRows.map((row, idx) => mapLabelRow(row, idx));

    const commentRows = valueRanges[4]?.values || [];
    const comments = commentRows.map((row, idx) => mapCommentRow(row, idx));

    const relationshipRows = valueRanges[5]?.values || [];
    const relationships = relationshipRows.map((row, idx) => mapRelationshipRow(row, idx));

    const settingsRows = valueRanges[6]?.values || [];
    const settings = {};
    settingsRows.forEach(row => {
      if (row.length >= 2 && row[0]) {
        settings[row[0]] = row[1] || '';
      }
    });

    const memberRows = valueRanges[7]?.values || [];
    const members = memberRows.map((row, idx) => mapMemberRow(row, idx));

    return { tasks, epics, categories, labels, comments, relationships, settings, members };
  },

  /**
   * Add a new task to the Tasks sheet
   */
  async addTask(spreadsheetId, task, userEmail) {
    const now = new Date().toISOString();
    const taskId = crypto.randomUUID();

    const labelsValue = Array.isArray(task.labels)
      ? task.labels.join(',')
      : (task.labels || '');

    const row = [
      taskId,
      task.boardId || '',
      task.epicId || '',
      task.header || '',
      task.description || '',
      task.categoryId || '',
      labelsValue,
      task.status || '',
      task.priority || '',
      task.dueDate || '',
      task.storyPoints || '',
      userEmail,
      now,
      task.assignee || '',
      now,
      userEmail,
      'FALSE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.TASKS + '!A:Q')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return {
      ...task,
      taskId,
      createdAt: now,
      createdBy: userEmail,
      updatedAt: now,
      updatedBy: userEmail,
      archived: false,
    };
  },

  /**
   * Update an existing task row
   */
  async updateTask(spreadsheetId, rowIndex, task, userEmail) {
    const now = new Date().toISOString();

    // Serialize labels: if it's an array, join to comma-separated string
    const labelsValue = Array.isArray(task.labels)
      ? task.labels.join(',')
      : (task.labels || '');

    const row = [
      task.taskId || '',
      task.boardId || '',
      task.epicId || '',
      task.header || '',
      task.description || '',
      task.categoryId || '',
      labelsValue,
      task.status || '',
      task.priority || '',
      task.dueDate || '',
      task.storyPoints || '',
      task.createdBy || '',
      task.createdAt || '',
      task.assignee || '',
      now,
      userEmail,
      'FALSE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.TASKS + `!A${rowIndex}:Q${rowIndex}`)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...task, updatedAt: now, updatedBy: userEmail, archived: false };
  },

  /**
   * Archive a task by setting archived=TRUE
   */
  async archiveTask(spreadsheetId, rowIndex, task, userEmail) {
    const now = new Date().toISOString();

    const labelsValue = Array.isArray(task.labels)
      ? task.labels.join(',')
      : (task.labels || '');

    const row = [
      task.taskId || '',
      task.boardId || '',
      task.epicId || '',
      task.header || '',
      task.description || '',
      task.categoryId || '',
      labelsValue,
      task.status || '',
      task.priority || '',
      task.dueDate || '',
      task.storyPoints || '',
      task.createdBy || '',
      task.createdAt || '',
      task.assignee || '',
      now,
      userEmail,
      'TRUE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.TASKS + `!A${rowIndex}:Q${rowIndex}`)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...task, updatedAt: now, updatedBy: userEmail, archived: true };
  },

  /**
   * Restore an archived task by setting archived=FALSE
   */
  async restoreTask(spreadsheetId, rowIndex, task, userEmail) {
    const now = new Date().toISOString();

    const labelsValue = Array.isArray(task.labels)
      ? task.labels.join(',')
      : (task.labels || '');

    const row = [
      task.taskId || '',
      task.boardId || '',
      task.epicId || '',
      task.header || '',
      task.description || '',
      task.categoryId || '',
      labelsValue,
      task.status || '',
      task.priority || '',
      task.dueDate || '',
      task.storyPoints || '',
      task.createdBy || '',
      task.createdAt || '',
      task.assignee || '',
      now,
      userEmail,
      'FALSE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.TASKS + `!A${rowIndex}:Q${rowIndex}`)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...task, updatedAt: now, updatedBy: userEmail, archived: false };
  },
};

export default taskMethods;
