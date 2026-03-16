import {
  APP_PROPERTY_KEY,
  APP_PROPERTY_VALUE,
} from './constants';


const appPropertiesMethods = {
  buildAppPropertiesPayload(additionalProperties = {}) {
    const payload = {
      [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE,
    };

    Object.entries(additionalProperties).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        payload[key] = value.toString();
        return;
      }

      payload[key] = String(value);
    });

    return payload;
  },

  async updateProjectAppProperties(spreadsheetId, properties = {}) {
    const appProperties = this.buildAppPropertiesPayload(properties);

    await this.makeRequest(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,appProperties`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          appProperties,
        }),
      }
    );
  },

  async tagSpreadsheet(spreadsheetId) {
    await this.updateProjectAppProperties(spreadsheetId);
  },
};

export default appPropertiesMethods;
