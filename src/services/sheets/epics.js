import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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

const epicMethods = {
  async addEpic(spreadsheetId, epic, userEmail) {
    const now = new Date().toISOString();
    const epicId = crypto.randomUUID();

    const row = [
      epicId,
      epic.boardId || '',
      epic.name || '',
      epic.description || '',
      epic.color || '',
      epic.startDate || '',
      epic.dueDate || '',
      now,
      userEmail,
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.EPICS + '!A:I')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...epic, epicId, createdAt: now, createdBy: userEmail };
  },

  async updateEpic(spreadsheetId, rowIndex, epic) {
    const row = [
      epic.epicId || '',
      epic.boardId || '',
      epic.name || '',
      epic.description || '',
      epic.color || '',
      epic.startDate || '',
      epic.dueDate || '',
      epic.createdAt || '',
      epic.createdBy || '',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.EPICS + '!A' + rowIndex + ':I' + rowIndex)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...epic };
  },

  async deleteEpic(spreadsheetId, rowIndex) {
    const spreadsheet = await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`
    );

    let epicsSheetId = null;
    if (spreadsheet.sheets) {
      for (const sheet of spreadsheet.sheets) {
        if (sheet.properties.title === SHEET_TABS.EPICS) {
          epicsSheetId = sheet.properties.sheetId;
          break;
        }
      }
    }

    if (epicsSheetId === null) {
      throw new Error(`Sheet "${SHEET_TABS.EPICS}" not found`);
    }

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: epicsSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          }],
        }),
      }
    );
  },
};

export default epicMethods;
