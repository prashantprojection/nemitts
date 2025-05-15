// This component is deprecated and will be removed in a future update.
// Use direct grid layouts in your components instead for better control over responsiveness.

import React from 'react';

interface SettingsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  minWidth?: string;
}

/**
 * A responsive grid layout for settings panels
 * Automatically adjusts based on screen size:
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 2-4 columns (based on props)
 */
const SettingsGrid = ({
  children,
  columns = 2,
  className = '',
  minWidth = '320px'
}: SettingsGridProps) => {
  // Determine the grid columns class based on the columns prop and screen size
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-6 auto-rows-auto ${className}`} style={{ minWidth }}>
      {children}
    </div>
  );
};

export default SettingsGrid;
