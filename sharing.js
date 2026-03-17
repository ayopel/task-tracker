const sharingMethods = {
  async listProjectCollaborators(spreadsheetId) {
    try {
      const response = await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?fields=permissions(id,emailAddress,displayName,role,type)&supportsAllDrives=false`
      );

      return response.permissions || [];
    } catch (error) {
      console.error('Error fetching project collaborators:', error);
      throw error;
    }
  },

  async shareProjectWithUser(spreadsheetId, emailAddress, role = 'writer') {
    try {
      return await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          body: JSON.stringify({
            role,
            type: 'user',
            emailAddress,
          }),
        }
      );
    } catch (error) {
      console.error('Error sharing project:', error);
      throw error;
    }
  },

  async joinBoardByLink(spreadsheetId) {
    // Verify the board exists and is accessible, then add a shortcut to user's Drive
    const file = await this.makeRequest(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,name,appProperties,capabilities(canEdit)`
    );
    // Add shortcut so board appears in user's board list
    try {
      await this.makeRequest(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            mimeType: 'application/vnd.google-apps.shortcut',
            shortcutDetails: { targetId: spreadsheetId },
          }),
        }
      );
    } catch (err) {
      // Only ignore "already exists" errors; propagate permission or other real errors
      if (!err.message?.includes('already exists')) {
        console.warn('Warning: Could not create shortcut, but board access is OK:', err);
      }
    }
    return file;
  },

  async removeProjectCollaborator(spreadsheetId, permissionId) {
    try {
      await this.makeRequest(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions/${permissionId}?supportsAllDrives=false`,
        {
          method: 'DELETE',
        }
      );
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  },
};

export default sharingMethods;
