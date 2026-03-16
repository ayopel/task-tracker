import React from 'react';

export default function Badge({
  children,
  color = '#3B82F6',
  variant = 'solid',
  size = 'sm',
}) {
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs font-medium',
    md: 'px-3 py-1 text-sm font-medium',
  };

  if (variant === 'solid') {
    return (
      <span
        className={`${sizeClasses[size]} rounded-full text-white transition-colors`}
        style={{
          backgroundColor: color,
        }}
      >
        {children}
      </span>
    );
  }

  if (variant === 'outline') {
    return (
      <span
        className={`${sizeClasses[size]} rounded-full border transition-colors`}
        style={{
          borderColor: color,
          color: color,
          backgroundColor: 'transparent',
        }}
      >
        {children}
      </span>
    );
  }

  return null;
}
