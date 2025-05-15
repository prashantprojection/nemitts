import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Mic,
  Settings,
  Palette,
  ChevronRight,
  // X // Removed unused import
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import twitchAuthService from '@/services/twitch/TwitchAuthService';
import { useSession } from '@/contexts/SessionContext';
import VoiceSelectionPanel from './VoiceSelectionPanel';
import VoiceControlsPanel from './VoiceControlsPanel';
import VoiceRandomPanel from './VoiceRandomPanel';
import StylePanel from './StylePanel';
import { useNavigate } from 'react-router-dom';

interface RightPanelProps {
  // onClose?: () => void; // Removed unused prop
  onShowFAQ: () => void;
}

const RightPanel = ({ /* onClose, */ onShowFAQ }: RightPanelProps) => {
  const { theme /*, setTheme */ } = useTheme(); // Removed unused setTheme
  const { channelName } = useSession();
  const navigate = useNavigate();
  const authState = twitchAuthService.getAuthState();
  const isLoggedIn = authState.isLoggedIn;
  const username = authState.username || '';
  const displayName = authState.displayName || username;
  const profileImage = authState.profileImage;

  // Active section state
  const [activeSection, setActiveSection] = React.useState<string | null>('menu');

  // const handleLogout = () => { // Removed unused function
  //   twitchAuthService.logout();
  // };

  // Add event listener for back-to-menu
  React.useEffect(() => {
    const handleBackToMenu = () => {
      setActiveSection('menu');
    };

    window.addEventListener('back-to-menu', handleBackToMenu);

    return () => {
      window.removeEventListener('back-to-menu', handleBackToMenu);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header with user info - always visible */}
      <div className="p-4 border-b border-border/30 z-20 relative bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {profileImage ? (
              <img
                src={profileImage}
                alt={displayName}
                className="w-8 h-8 rounded-full mr-3"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div>
              <div className="font-medium text-sm">{displayName || 'Guest'}</div>
              {isLoggedIn && (
                <div className="text-xs text-muted-foreground">@{username}</div>
              )}
            </div>
          </div>

          {/* Close button removed - panel is always visible */}
        </div>
      </div>

{/* Menu options moved to content area */}

      {/* Version info - only show on main menu */}
      {activeSection === 'menu' && (
        <div className="p-3 text-xs text-center text-muted-foreground border-t border-border/30">
          <div>TTS Reader v1.0.0</div>
          {channelName && (
            <div className="mt-1">Connected to: {channelName}</div>
          )}
        </div>
      )}

      {/* Content Area - conditionally rendered */}
      <div className="flex-1 overflow-hidden">
        {/* Main Menu */}
        {activeSection === 'menu' && (
          <ScrollArea className="h-full">
            <div className="p-2">
              {/* Voice Selection Option */}
              <Button
                variant="ghost"
                className="w-full justify-between rounded-lg p-3 mb-1 font-normal"
                onClick={() => setActiveSection('voice-selection')}
              >
                <div className="flex items-center">
                  <Mic className="h-4 w-4 mr-3" />
                  Voice Selection
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              {/* Voice Controls Option */}
              <Button
                variant="ghost"
                className="w-full justify-between rounded-lg p-3 mb-1 font-normal"
                onClick={() => setActiveSection('voice-controls')}
              >
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Voice Controls
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              {/* Voice Randomization Option */}
              <Button
                variant="ghost"
                className="w-full justify-between rounded-lg p-3 mb-1 font-normal"
                onClick={() => setActiveSection('voice-random')}
              >
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.29 7 12 12 20.71 7" />
                    <line x1="12" y1="22" x2="12" y2="12" />
                  </svg>
                  Voice Random
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              {/* Customize Option */}
              <Button
                variant="ghost"
                className="w-full justify-between rounded-lg p-3 mb-1 font-normal"
                onClick={() => navigate('/settings')}
              >
                <div className="flex items-center">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              {/* Style Option */}
              <Button
                variant="ghost"
                className="w-full justify-between rounded-lg p-3 mb-1 font-normal"
                onClick={() => setActiveSection('style')}
              >
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-3" />
                  Theme
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Separator className="my-3" />

              {/* FAQ Button */}
              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg p-3 mb-1 font-normal"
                onClick={onShowFAQ}
              >
                <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                FAQ & Support
              </Button>
            </div>
          </ScrollArea>
        )}

        {/* Sponsored Channels Section - Add this new section */} 
        {activeSection === 'menu' && (
          <div className="p-2 border-t border-border/30">
            <h4 className="text-xs font-semibold text-muted-foreground px-3 py-2">Sponsored Channels</h4>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-lg p-3 mb-1 font-normal text-sm"
              onClick={() => window.open('https://twitch.tv/nemi_nemesis', '_blank')}
            >
              nemi_nemesis
            </Button>
            {/* Add more sponsored channels here in the future */}
          </div>
        )}

        {/* Voice Selection Panel */} 
        {activeSection === 'voice-selection' && (
          <VoiceSelectionPanel onBack={() => setActiveSection('menu')} />
        )}

        {/* Voice Controls Panel */}
        {activeSection === 'voice-controls' && (
          <VoiceControlsPanel onBack={() => setActiveSection('menu')} />
        )}

        {/* Voice Random Panel */}
        {activeSection === 'voice-random' && (
          <VoiceRandomPanel onBack={() => setActiveSection('menu')} />
        )}

        {/* Style Panel */}
        {activeSection === 'style' && (
          <StylePanel onBack={() => setActiveSection('menu')} />
        )}
      </div>
    </div>
  );
};

export default RightPanel;
