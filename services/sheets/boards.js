import {
  APP_FOLDER_NAME,
  FOLDER_MIME_TYPE,
  SPREADSHEET_MIME_TYPE,
  FILE_PREFIX,
  APP_PROPERTY_KEY,
  APP_PROPERTY_VALUE,
  APP_PROPERTY_QUERY,
  APP_FOLDER_COLOR,
  SHEET_TABS,
  DEFAULT_CATEGORIES,
  DEFAULT_STATUSES,
} from './constants.js';

const boardMethods = {
  async findAppFolder(forceRefresh = false) {
    if (!forceRefresh && this.appFolderId) {
      return this.appFolderId;
    }

    try {
      const searchResponse = await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${APP_FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and 'root' in parents and trashed=false`)}&fields=files(id,name,folderColorRgb)&pageSize=10`
      );

      if (searchResponse.files && searchResponse.files.length > 0) {
        this.appFolderId = searchResponse.files[0].id;
        this.persistFolderId(this.appFolderId);
        return this.appFolderId;
      }

      this.appFolderId = null;
      this.persistFolderId(null);
      return null;
    } catch (error) {
      console.error('Error finding app folder:', error);
      return null;
    }
  },

  async createAppFolder() {
    const createResponse = await this.makeRequest(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        body: JSON.stringify({
          name: APP_FOLDER_NAME,
          mimeType: FOLDER_MIME_TYPE,
          parents: ['root'],
          folderColorRgb: APP_FOLDER_COLOR,
        }),
      }
    );

    this.appFolderId = createResponse.id;
    this.persistFolderId(this.appFolderId);
    return this.appFolderId;
  },

  async verifyFolderAccess(folderId) {
    try {
      await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id`
      );
      return true;
    } catch (error) {
      return false;
    }
  },

  async ensureAppFolder() {
    let folderId = await this.findAppFolder();

    if (folderId) {
      const accessible = await this.verifyFolderAccess(folderId).catch(() => false);
      if (!accessible) {
        folderId = null;
        this.appFolderId = null;
        this.persistFolderId(null);
      }
    }

    if (!folderId) {
      folderId = await this.createAppFolder();
    }

    return folderId;
  },

  async createBoard(boardName) {
    const folderId = await this.ensureAppFolder();
    const fullName = `${FILE_PREFIX}${boardName}`;

    // 1. Create spreadsheet
    const createResponse = await this.makeRequest(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        method: 'POST',
        body: JSON.stringify({
          properties: { title: fullName },
          sheets: [
            { properties: { title: SHEET_TABS.TASKS } },
            { properties: { title: SHEET_TABS.EPICS } },
            { properties: { title: SHEET_TABS.CATEGORIES } },
            { properties: { title: SHEET_TABS.LABELS } },
            { properties: { title: SHEET_TABS.COMMENTS } },
            { properties: { title: SHEET_TABS.RELATIONSHIPS } },
            { properties: { title: SHEET_TABS.SETTINGS } },
            { properties: { title: SHEET_TABS.MEMBERS } },
          ],
        }),
      }
    );

    const spreadsheetId = createResponse.spreadsheetId;

    // 2. Move to app folder
    this.makeRequest(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&removeParents=root&fields=id,parents`,
      { method: 'PATCH' }
    ).catch(err => console.warn('Could not move spreadsheet to folder:', err));

    // 3. Initialize sheets data + tag file
    await Promise.all([
      this.initializeBoardData(spreadsheetId, boardName, createResponse.sheets),
      this.tagBoardFile(spreadsheetId, boardName),
    ]);

    return {
      spreadsheetId,
      spreadsheetUrl: createResponse.spreadsheetUrl,
      boardName,
    };
  },

  async initializeBoardData(spreadsheetId, boardName, sheets) {
    const today = new Date().toISOString().split('T')[0];

    const valueRequests = [];

    // Settings sheet
    valueRequests.push({
      range: `${SHEET_TABS.SETTINGS}!A1:B10`,
      values: [
        ['Setting', 'Value'],
        ['Board Name', boardName],
        ['Description', ''],
        ['Created Date', today],
        ['Status Flow', DEFAULT_STATUSES.map(s => s.name).join(',')],
      ],
    });

    // Tasks header row
    valueRequests.push({
      range: `${SHEET_TABS.TASKS}!A1:Q1`,
      values: [['taskId','boardId','epicId','header','description','categoryId','labels','status','priority','dueDate','storyPoints','createdBy','createdAt','assignee','updatedAt','updatedBy','archived']],
    });

    // Epics header
    valueRequests.push({
      range: `${SHEET_TABS.EPICS}!A1:I1`,
      values: [['epicId','boardId','name','description','color','startDate','dueDate','createdAt','createdBy']],
    });

    // Categories header + defaults
    const catRows = [['categoryId','name','color','isDefault','boardId']];
    DEFAULT_CATEGORIES.forEach(cat => {
      catRows.push([crypto.randomUUID(), cat.name, cat.color, 'TRUE', spreadsheetId]);
    });
    valueRequests.push({
      range: `${SHEET_TABS.CATEGORIES}!A1`,
      values: catRows,
    });

    // Labels header
    valueRequests.push({
      range: `${SHEET_TABS.LABELS}!A1:D1`,
      values: [['labelId','name','boardId','createdAt']],
    });

    // Comments header
    valueRequests.push({
      range: `${SHEET_TABS.COMMENTS}!A1:I1`,
      values: [['commentId','taskId','boardId','body','mentions','createdBy','createdAt','editedAt','deleted']],
    });

    // Relationships header
    valueRequests.push({
      range: `${SHEET_TABS.RELATIONSHIPS}!A1:F1`,
      values: [['relationId','fromTaskId','toTaskId','type','createdBy','createdAt']],
    });

    // Members header
    valueRequests.push({
      range: `${SHEET_TABS.MEMBERS}!A1:E1`,
      values: [['email','displayName','role','photoUrl','lastSeen']],
    });

    await this.makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: valueRequests,
        }),
      }
    );

    // Format Tasks header row bold
    const tasksSheet = sheets?.find(s => s.properties.title === SHEET_TABS.TASKS);
    if (tasksSheet) {
      const sheetId = tasksSheet.properties.sheetId;
      await this.makeRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 17 },
                cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 } } },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            }],
          }),
        }
      );
    }
  },

  async tagBoardFile(spreadsheetId, boardName) {
    try {
      await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,appProperties`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            appProperties: {
              [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE,
              boardName,
            },
          }),
        }
      );
    } catch (err) {
      console.warn('Could not tag board file:', err);
    }
  },

  mapBoardFile(file, ownership = 'owned') {
    return {
      id: file.id,
      name: (file.name || '').replace(FILE_PREFIX, ''),
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      ownership,
      ownerEmail: file.owners?.[0]?.emailAddress || null,
      canEdit: file.capabilities?.canEdit ?? false,
      canShare: file.capabilities?.canShare ?? false,
      isShared: !!file.shared,
      raw: file,
    };
  },

  buildDriveListUrl(query) {
    const params = new URLSearchParams({
      q: query,
      fields: 'files(id,name,createdTime,modifiedTime,owners(emailAddress,displayName),capabilities(canEdit,canShare),ownedByMe,appProperties,shared)',
      orderBy: 'modifiedTime desc',
      pageSize: '100',
      spaces: 'drive',
      corpora: 'user',
    });
    return `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  },

  async listBoards() {
    try {
      const folderId = await this.findAppFolder();
      const requests = [];

      if (folderId) {
        const ownedQuery = `'${folderId}' in parents and mimeType='${SPREADSHEET_MIME_TYPE}' and trashed=false`;
        requests.push(this.makeRequest(this.buildDriveListUrl(ownedQuery)).then(r => ({ r, ownership: 'owned' })));
      }

      const sharedQuery = `sharedWithMe=true and mimeType='${SPREADSHEET_MIME_TYPE}' and trashed=false and (${APP_PROPERTY_QUERY})`;
      requests.push(this.makeRequest(this.buildDriveListUrl(sharedQuery)).then(r => ({ r, ownership: 'shared' })));

      const results = await Promise.allSettled(requests);
      const boardMap = new Map();

      results.forEach(result => {
        if (result.status !== 'fulfilled') return;
        const { r, ownership } = result.value;
        (r.files || []).forEach(file => {
          if (!boardMap.has(file.id)) {
            boardMap.set(file.id, this.mapBoardFile(file, ownership));
          }
        });
      });

      return Array.from(boardMap.values()).sort(
        (a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime)
      );
    } catch (error) {
      console.error('Error listing boards:', error);
      return [];
    }
  },

  async deleteBoard(spreadsheetId) {
    await this.makeRequest(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?supportsAllDrives=true`,
      {
        method: 'PATCH',
        body: JSON.stringify({ trashed: true }),
      }
    );
    return true;
  },

  async getBoardSettings(spreadsheetId) {
    try {
      const response = await this.makeRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_TABS.SETTINGS}!A1:B20`
      );
      const rows = response.values || [];
      const settings = {};
      rows.forEach(([key, value]) => { if (key) settings[key] = value || ''; });
      return settings;
    } catch (error) {
      console.error('Error getting board settings:', error);
      return {};
    }
  },

  async updateBoardSettings(spreadsheetId, boardData) {
    // Build list of key-value pairs to persist
    const settingsToWrite = [];
    if (boardData.statusFlow !== undefined) settingsToWrite.push(['statusFlow', boardData.statusFlow]);
    if (boardData.statusColors !== undefined) settingsToWrite.push(['statusColors', boardData.statusColors]);
    if (boardData.categories !== undefined) settingsToWrite.push(['categories', boardData.categories]);
    if (settingsToWrite.length === 0) return;

    // Fetch existing rows to locate keys
    const response = await this.makeRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_TABS.SETTINGS}!A1:B20`
    );
    const rows = response.values || [];
    const keyRowMap = {};
    rows.forEach((row, idx) => { if (row[0]) keyRowMap[row[0]] = idx + 1; });

    const updateData = [];
    const appendRows = [];
    for (const [key, value] of settingsToWrite) {
      if (keyRowMap[key]) {
        updateData.push({ range: `${SHEET_TABS.SETTINGS}!A${keyRowMap[key]}:B${keyRowMap[key]}`, values: [[key, value]] });
      } else {
        appendRows.push([key, value]);
      }
    }

    if (updateData.length > 0) {
      await this.makeRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        { method: 'POST', body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updateData }) }
      );
    }
    for (const row of appendRows) {
      await this.makeRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.SETTINGS + '!A:B')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values: [row] }) }
      );
    }
  },
};

export default boardMethods;
