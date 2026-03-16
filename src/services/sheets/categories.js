import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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

const categoryMethods = {
  async getCategories(spreadsheetId) {
    const response = await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.CATEGORIES + '!A2:E100')}`
    );
    const rows = response.values || [];
    return rows.map((row, idx) => mapCategoryRow(row, idx));
  },

  async addCategory(spreadsheetId, category) {
    const categoryId = crypto.randomUUID();
    const row = [
      categoryId,
      category.name || '',
      category.color || '',
      'FALSE',
      category.boardId || '',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.CATEGORIES + '!A:E')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...category, categoryId, isDefault: false };
  },

  async updateCategory(spreadsheetId, rowIndex, category) {
    const row = [
      category.categoryId || '',
      category.name || '',
      category.color || '',
      category.isDefault === true ? 'TRUE' : 'FALSE',
      category.boardId || '',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.CATEGORIES + '!A' + rowIndex + ':E' + rowIndex)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...category };
  },
};

export default categoryMethods;
