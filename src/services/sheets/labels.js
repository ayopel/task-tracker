import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const mapLabelRow = (row, rowIndex) => {
  return {
    labelId: row[0] || '',
    name: row[1] || '',
    boardId: row[2] || '',
    createdAt: row[3] || '',
    rowIndex: rowIndex + 2,
  };
};

const labelMethods = {
  async getLabels(spreadsheetId) {
    const response = await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.LABELS + '!A2:D100')}`
    );
    const rows = response.values || [];
    return rows.map((row, idx) => mapLabelRow(row, idx));
  },

  async addLabel(spreadsheetId, label) {
    const now = new Date().toISOString();
    const labelId = crypto.randomUUID();
    const row = [labelId, label.name || '', label.boardId || '', now];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.LABELS + '!A:D')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...label, labelId, createdAt: now };
  },

  async ensureLabels(spreadsheetId, labelNames, boardId) {
    const existingLabels = await this.getLabels(spreadsheetId);
    const existingNames = new Set(existingLabels.map(l => l.name));
    const labelsToAdd = labelNames.filter(name => !existingNames.has(name));
    for (const name of labelsToAdd) {
      await this.addLabel(spreadsheetId, { name, boardId });
    }
    return this.getLabels(spreadsheetId);
  },
};

export default labelMethods;
