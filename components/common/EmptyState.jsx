import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] px-4">
      {Icon && (
        <div className="mb-4 p-3 rounded-full bg-gray-100 dark:bg-gray-800">
          <Icon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
