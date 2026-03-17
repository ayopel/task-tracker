import React from 'react';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
