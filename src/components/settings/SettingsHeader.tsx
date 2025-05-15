import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';

interface SettingsHeaderProps {
  title: string;
  onLogout?: () => void;
}

const SettingsHeader = ({ title, onLogout }: SettingsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between h-14 border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50 px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full h-8 w-8"
          title="Back to Chat"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {onLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </header>
  );
};

export default SettingsHeader;
