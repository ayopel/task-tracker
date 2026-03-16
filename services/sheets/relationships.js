import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const relationshipMethods = {
  async addRelationship(spreadsheetId, relationship, userEmail) {
    const now = new Date().toISOString();
    const relationId = crypto.randomUUID();

    const row = [
      relationId,
      relationship.fromTaskId || '',
      relationship.toTaskId || '',
      relationship.type || '',
      userEmail,
      now,
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.RELATIONSHIPS + '!A:F')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...relationship, relationId, createdBy: userEmail, createdAt: now };
  },

  async deleteRelationship(spreadsheetId, rowIndex) {
    const spreadsheet = await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`
    );

    let relationshipsSheetId = null;
    if (spreadsheet.sheets) {
      for (const sheet of spreadsheet.sheets) {
        if (sheet.properties.title === SHEET_TABS.RELATIONSHIPS) {
          relationshipsSheetId = sheet.properties.sheetId;
          break;
        }
      }
    }

    if (relationshipsSheetId === null) {
      throw new Error(`Sheet "${SHEET_TABS.RELATIONSHIPS}" not found`);
    }

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: relationshipsSheetId,
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

export default relationshipMethods;
