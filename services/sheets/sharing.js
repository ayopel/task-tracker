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
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=false`,
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
