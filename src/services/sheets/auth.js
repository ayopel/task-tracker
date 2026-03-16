import { FOLDER_ID_KEY } from './constants';

const authMethods = {
  setAccessToken(token) {
    this.accessToken = token;
  },

  setCurrentUser(email) {
    this.userEmail = email || null;
    this.folderStorageKey = this.userEmail
      ? `${FOLDER_ID_KEY}:${this.userEmail}`
      : FOLDER_ID_KEY;
    this.appFolderId = this.getStoredFolderId();
  },

  clearSession() {
    this.accessToken = null;
    this.appFolderId = null;
    this.userEmail = null;
    this.folderStorageKey = FOLDER_ID_KEY;
  },

  getStoredFolderId() {
    try {
      return localStorage.getItem(this.folderStorageKey);
    } catch (error) {
      console.error('Error reading folder cache:', error);
      return null;
    }
  },

  persistFolderId(folderId) {
    try {
      if (folderId) {
        localStorage.setItem(this.folderStorageKey, folderId);
      } else {
        localStorage.removeItem(this.folderStorageKey);
      }
    } catch (error) {
      console.error('Error persisting folder cache:', error);
    }
  },

  async makeRequest(url, options = {}, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      const isNoContent = response.status === 204;

      if (!response.ok) {
        let errorMessage = `API request failed with status ${response.status}`;

        try {
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error?.message || errorMessage;
          } else {
            const textError = await response.text();
            errorMessage = textError;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }

        // Retry on 503 (Service Unavailable) or 429 (Too Many Requests)
        if ((response.status === 503 || response.status === 429) && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`API request failed with ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(url, options, retryCount + 1);
        }

        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }

      if (isNoContent || !contentType) {
        return null;
      }

      if (contentType.includes('application/json')) {
        return response.json();
      }

      return response.text();
    } catch (error) {
      // Retry on network errors, but only if we're online
      // Skip retries when offline to fail fast and use cached data
      if (retryCount < maxRetries && error.message.includes('Failed to fetch') && navigator.onLine) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.warn(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(url, options, retryCount + 1);
      }
      throw error;
    }
  },
};

export default authMethods;
