import React from 'react';
import { cn } from '@/lib/utils';
import {
  Mic2,
  Filter,
  Users,
  Headphones,
  Keyboard,
  Tv2,
  ChevronRight,
  MessageSquare,
  UserCheck,
  Settings2,
  Sliders,
  ExternalLink,
  Shuffle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type SettingsCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
};

const SettingsSidebar = ({ activeTab, onTabChange }: SettingsSidebarProps) => {
  // Define settings categories
  const categories: SettingsCategory[] = [
    {
      id: 'voice',
      label: 'Voice Settings',
      icon: <Mic2 className="h-4 w-4" />,
      description: 'Configure general voice settings'
    },
    {
      id: 'external-tts',
      label: 'External TTS',
      icon: <ExternalLink className="h-4 w-4" />,
      description: 'Configure external TTS services'
    },
    {
      id: 'message-filters',
      label: 'Message Filters',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Configure which messages are read aloud'
    },
    {
      id: 'blocklists',
      label: 'Blocklists',
      icon: <Filter className="h-4 w-4" />,
      description: 'Manage blocked users and words'
    },
    {
      id: 'word-replacements',
      label: 'Word Replacements',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 9h10" />
          <path d="M4 4h16" />
          <path d="M4 14h6" />
          <path d="M4 19h16" />
          <path d="M14 14h6" />
          <path d="M10 4L8 9" />
          <path d="M17 14l2 5" />
        </svg>
      ),
      description: 'Configure word replacements for TTS'
    },
    {
      id: 'nicknames',
      label: 'Nicknames',
      icon: <Users className="h-4 w-4" />,
      description: 'Configure nicknames for users'
    },
    // Voice randomization is now handled in the right panel only
    {
      id: 'user-voices',
      label: 'User Voices',
      icon: <Users className="h-4 w-4" />,
      description: 'Assign voices to specific users'
    },
    {
      id: 'allowed-users',
      label: 'Allowed Users',
      icon: <UserCheck className="h-4 w-4" />,
      description: 'Control which users can trigger TTS'
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <Settings2 className="h-4 w-4" />,
      description: 'Configure integrations with other services'
    }
  ];

  // Define subcategories for integrations
  const integrationSubcategories: SettingsCategory[] = [
    {
      id: 'twitch',
      label: 'Twitch',
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.3 3H21v11.7l-4.7 4.7h-3.9l-2.5 2.4H7v-2.4H3V6.2L4.3 3zM5 17.4h4v2.4h.095l2.5-2.4h3.877L19 13.574V5H5v12.4zM15 8h2v4.7h-2V8zm0 0M9 8h2v4.7H9V8z" />
        </svg>
      ),
    },
    {
      id: 'keyboard',
      label: 'Keyboard Shortcuts',
      icon: <Keyboard className="h-4 w-4" />,
    },
    {
      id: 'obs',
      label: 'OBS Integration',
      icon: <Tv2 className="h-4 w-4" />,
    }
  ];

  return (
    <div className="h-full border-r border-border/40 bg-card/30 w-64 flex-shrink-0">
      <div className="p-4 border-b border-border/40">
        <h2 className="text-lg font-medium">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your TTS Reader</p>
      </div>

      <ScrollArea className="h-[calc(100%-5rem)]">
        <div className="p-2">
          {categories.map((category) => (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => onTabChange(category.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md flex items-center justify-between group transition-colors",
                  activeTab === category.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/80 text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex-shrink-0",
                    activeTab === category.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {category.icon}
                  </span>
                  <span className="font-medium">{category.label}</span>
                </div>
                {category.id === 'integrations' && (
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    activeTab.startsWith('integrations') ? "rotate-90" : ""
                  )} />
                )}
              </button>

              {/* Show subcategories for integrations */}
              {category.id === 'integrations' && activeTab.startsWith('integrations') && (
                <div className="ml-4 mt-1 border-l border-border/40 pl-2">
                  {integrationSubcategories.map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={() => onTabChange(`integrations-${subcat.id}`)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md flex items-center gap-3 group transition-colors mt-1",
                        activeTab === `integrations-${subcat.id}`
                          ? "bg-primary/80 text-primary-foreground"
                          : "hover:bg-muted/80 text-foreground"
                      )}
                    >
                      <span className={cn(
                        "flex-shrink-0",
                        activeTab === `integrations-${subcat.id}` ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {subcat.icon}
                      </span>
                      <span className="font-medium">{subcat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsSidebar;
