// src/services/googleAuthService.js

const TOKEN_STORAGE_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';
const PEOPLE_CACHE_TTL_MS = 5 * 60 * 1000;

class GoogleAuthService {
  constructor() {
    this.accessToken = null;
    this.tokenClient = null;
    this.gisLoaded = false;
    this.gisLoadingPromise = null;
    this.peopleCache = new Map();
  }

  // Initialize Google Identity Services
  async initializeGoogleIdentity(onSuccess, onError) {

    // Check for stored token first
    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.accessToken = storedToken;
      // console.log('✅ Using stored token');
      if (onSuccess) await onSuccess(storedToken);
    }

    return this.loadGoogleScript()
      .then(() => {
        this.initTokenClient(onSuccess, onError);
      })
      .catch((error) => {
        console.error('Failed to load Google Identity script:', error);
        if (onError) onError(error);
      });
  }

  loadGoogleScript() {
    if (this.gisLoaded) {
      return Promise.resolve();
    }

    if (this.gisLoadingPromise) {
      return this.gisLoadingPromise;
    }

    this.gisLoadingPromise = new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        this.gisLoaded = true;
        this.gisLoadingPromise = null;
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.gisLoaded = true;
          this.gisLoadingPromise = null;
          resolve();
        });
        existingScript.addEventListener('error', (err) => {
          this.gisLoadingPromise = null;
          reject(err);
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        this.gisLoadingPromise = null;
        resolve();
      };
      script.onerror = (err) => {
        this.gisLoadingPromise = null;
        reject(err);
      };
      document.body.appendChild(script);
    });

    return this.gisLoadingPromise;
  }

  // Initialize the token client for OAuth
  initTokenClient(onSuccess, onError) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const scope = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/contacts.readonly',
    ].join(' ');

    this._onError = onError;
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scope,
      callback: (response) => {
        if (response.error) {
          console.error('Token error:', response);
          if (onError) onError(response.error);
          return;
        }

        this.accessToken = response.access_token;

        // Store token with expiry (default 1 hour)
        const expiryTime = Date.now() + (response.expires_in || 3600) * 1000;
        this.storeToken(response.access_token, expiryTime);

        if (onSuccess) onSuccess(response.access_token);
      },
      error_callback: (error) => {
        console.error('Google sign-in error:', error);
        if (onError) onError(error);
      },
    });
  }

  // Store token in localStorage
  storeToken(token, expiryTime) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  // Get stored token if still valid
  getStoredToken() {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

      if (!token || !expiry) {
        return null;
      }

      // Check if token has expired (with 5-minute buffer)
      const now = Date.now();
      const expiryTime = parseInt(expiry, 10);

      if (now >= expiryTime - (5 * 60 * 1000)) {
        // Token expired or about to expire
        this.clearStoredToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Clear stored token
  clearStoredToken() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  // Request access token (shows Google sign-in popup)
  requestAccessToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    }

    this.loadGoogleScript()
      .then(() => {
        if (!this.tokenClient) {
          this.initTokenClient();
        }
        if (this.tokenClient) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        }
      })
      .catch((error) => {
        console.error('Unable to load Google Identity script for sign-in:', error);
        if (this._onError) this._onError(error);
      });
  }

  // Sign out
  signOut() {
    if (this.accessToken) {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('Access token revoked');
        });
      }
      this.accessToken = null;
    }
    this.clearStoredToken();
  }

  // Get current access token
  getAccessToken() {
    return this.accessToken;
  }

  // Check if user is signed in
  isSignedIn() {
    return !!this.accessToken;
  }

  // Get user info
  async getUserInfo() {
    if (!this.accessToken) {
      throw new Error('Not signed in');
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        // Token might be invalid, clear it
        this.clearStoredToken();
        throw new Error('Failed to get user info');
      }

      const data = await response.json();
      // Map Google API fields to app-expected field names
      return {
        email: data.email,
        displayName: data.name || null,
        photoURL: data.picture || null,
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  getCachedPeopleResults(queryKey) {
    if (!queryKey) return null;
    const cached = this.peopleCache.get(queryKey);
    if (!cached) {
      return null;
    }
    if (cached.expiry <= Date.now()) {
      this.peopleCache.delete(queryKey);
      return null;
    }
    return cached.results;
  }

  setCachedPeopleResults(queryKey, results) {
    if (!queryKey) return;
    this.peopleCache.set(queryKey, {
      results,
      expiry: Date.now() + PEOPLE_CACHE_TTL_MS,
    });
  }

  async searchContacts(query, { signal } = {}) {
    if (!query || !query.trim()) {
      return [];
    }

    if (!this.accessToken) {
      throw new Error('Not signed in');
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cached = this.getCachedPeopleResults(normalizedQuery);
    if (cached) {
      return cached;
    }

    const url = new URL('https://people.googleapis.com/v1/people:searchContacts');
    url.searchParams.set('query', query.trim());
    url.searchParams.set('pageSize', '10');
    url.searchParams.set('readMask', 'names,emailAddresses,photos');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearStoredToken();
      }
      throw new Error('Failed to search contacts');
    }

    const data = await response.json();
    const results = (data.results || []).flatMap((entry) => {
      const person = entry.person || {};
      const names = person.names || [];
      const displayName = names[0]?.displayName;
      const photos = person.photos || [];
      const photoUrl = photos[0]?.url;
      const emails = person.emailAddresses || [];

      return emails
        .map((emailEntry) => ({
          email: emailEntry.value,
          displayName: displayName || emailEntry.value,
          photoUrl,
          source: 'google',
        }))
        .filter((item) => !!item.email);
    });

    this.setCachedPeopleResults(normalizedQuery, results);
    return results;
  }
}

export default new GoogleAuthService();
