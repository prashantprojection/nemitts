import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface QuickVoiceAccessProps {
  isMuted?: boolean;
  onMuteToggle?: () => void;
  onVoiceSettingsClick?: () => void;
}

const QuickVoiceAccess: React.FC<QuickVoiceAccessProps> = ({
  isMuted = false,
  onMuteToggle,
  onVoiceSettingsClick,
}) => {
  return (
    <div className="p-4 space-y-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2"
          onClick={onMuteToggle}
        >
          {isMuted ? (
            <>
              <MicOff className="h-5 w-5" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Mute</span>
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-2"
          onClick={onVoiceSettingsClick}
        >
          <Volume2 className="h-5 w-5" />
          <span>Voice Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickVoiceAccess; 