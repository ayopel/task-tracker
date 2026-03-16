import React from 'react';
import { Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function SignInScreen({ onSignIn, isLoading }) {
  const features = [
    'No backend required',
    'Google Sheets storage',
    'Real-time collaboration',
    'Mobile-first design',
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            TaskTracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Lightweight project management powered by Google Sheets
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="mb-8">
            <LoadingSpinner message="Signing in..." />
          </div>
        ) : (
          <>
            {/* Feature Highlights */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Key Features
              </h2>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Check className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sign In Button */}
            <button
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign in with Google
            </button>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        )}
      </div>
    </div>
  );
}
