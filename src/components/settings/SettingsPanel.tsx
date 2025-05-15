// This component is deprecated and will be removed in a future update.
// Use direct card layouts in your components instead for better control over responsiveness.

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SettingsPanelProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  minWidth?: string;
}

const SettingsPanel = ({
  title,
  description,
  icon,
  className = '',
  children,
  fullWidth = false,
  minWidth
}: SettingsPanelProps) => {
  // Determine if we should span the full width
  const spanClass = fullWidth ? 'col-span-full' : '';

  return (
    <Card
      className={`border-border/40 overflow-hidden ${spanClass} ${className}`}
      style={minWidth ? { minWidth } : undefined}
    >
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
