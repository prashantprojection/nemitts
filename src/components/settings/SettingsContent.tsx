import React, { Suspense } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SettingsContentProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsContent = ({ title, description, children }: SettingsContentProps) => {
  return (
    <div className="flex-1 h-full flex flex-col">
      <div className="border-b border-border/40 p-6 bg-card/20">
        <h2 className="text-2xl font-semibold mb-1">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 w-full">
          <Suspense fallback={
            <div className="flex items-center justify-center h-[300px]">
              <LoadingSpinner size="md" text={`Loading ${title.toLowerCase()} settings...`} />
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsContent;
