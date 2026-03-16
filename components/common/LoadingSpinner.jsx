import React from 'react';

export default function LoadingSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px]">
      <div className="animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500 w-12 h-12" />
      {message && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}
