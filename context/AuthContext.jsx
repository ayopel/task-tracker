// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import googleAuthService from '../services/googleAuthService';
import sheetsService from '../services/sheetsService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const authInProgressRef = useRef(false);

  useEffect(() => {
    authInProgressRef.current = isAuthInProgress;
  }, [isAuthInProgress]);

  // Function to handle successful authentication
  const handleAuthSuccess = async (accessToken) => {
    setIsAuthenticated(true);
    setIsBootstrapping(true);
    setIsLoading(true);
    setIsAuthInProgress(false);
    sheetsService.setAccessToken(accessToken);

    try {
      const userInfo = await googleAuthService.getUserInfo();
      sheetsService.setCurrentUser(userInfo.email);
      await sheetsService.findAppFolder(true);
      setUser(userInfo);
      setIsAuthenticated(true);
      // console.log('✅ Authenticated as:', userInfo.email);
    } catch (error) {
      console.error('Error getting user info:', error);
      // If getting user info fails, the token is invalid - clear it
      googleAuthService.clearStoredToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsBootstrapping(false);
      setIsLoading(false); // Always set loading to false
    }
  };

  const handleAuthError = (error) => {
    console.error('Authentication error:', error);
    googleAuthService.clearStoredToken();
    setIsBootstrapping(false);
    setIsLoading(false);
    setIsAuthInProgress(false);
  };

  useEffect(() => {
    // Initialize Google Identity Services and end initial loading once ready
    const init = async () => {
      try {
        await googleAuthService.initializeGoogleIdentity(
          handleAuthSuccess,
          handleAuthError
        );
      } finally {
        setIsLoading((prev) =>
          authInProgressRef.current ? prev : false
        );
      }
    };

    init();
  }, []);

  const signIn = () => {
    setIsAuthInProgress(true);
    setIsLoading(true);
    googleAuthService.requestAccessToken();
  };

  const signOut = () => {
    googleAuthService.signOut();
    sheetsService.clearSession();
    setUser(null);
    setIsAuthenticated(false);
    setIsBootstrapping(false);
    setIsAuthInProgress(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isBootstrapping,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
