import { SHEET_TABS } from './constants.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const extractMentions = (body) => {
  const mentionRegex = /@([\w.+-]+@[\w.-]+\.\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    if (!mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }
  return mentions.join(',');
};

const commentMethods = {
  async addComment(spreadsheetId, comment, userEmail) {
    const now = new Date().toISOString();
    const commentId = crypto.randomUUID();
    const mentions = extractMentions(comment.body || '');

    const row = [
      commentId,
      comment.taskId || '',
      comment.boardId || '',
      comment.body || '',
      mentions,
      userEmail,
      now,
      '',
      'FALSE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.COMMENTS + '!A:I')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return {
      ...comment,
      commentId,
      mentions,
      createdAt: now,
      createdBy: userEmail,
      editedAt: '',
      deleted: false,
    };
  },

  async updateComment(spreadsheetId, rowIndex, comment) {
    const now = new Date().toISOString();
    const mentions = extractMentions(comment.body || '');

    const row = [
      comment.commentId || '',
      comment.taskId || '',
      comment.boardId || '',
      comment.body || '',
      mentions,
      comment.createdBy || '',
      comment.createdAt || '',
      now,
      comment.deleted === true ? 'TRUE' : 'FALSE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.COMMENTS + '!A' + rowIndex + ':I' + rowIndex)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...comment, mentions, editedAt: now };
  },

  async deleteComment(spreadsheetId, rowIndex, comment) {
    const now = new Date().toISOString();

    const row = [
      comment.commentId || '',
      comment.taskId || '',
      comment.boardId || '',
      '[deleted]',
      comment.mentions || '',
      comment.createdBy || '',
      comment.createdAt || '',
      now,
      'TRUE',
    ];

    await this.makeRequest(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_TABS.COMMENTS + '!A' + rowIndex + ':I' + rowIndex)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    return { ...comment, body: '[deleted]', deleted: true, editedAt: now };
  },
};

export default commentMethods;
