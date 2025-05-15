import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Check, AlignLeft, AlignRight, Users, Clock, MessageSquare } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useChatAppearance, MessageAlignment, ChatStyle } from '@/contexts/ChatAppearanceContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface StylePanelProps {
  onBack?: () => void;
}

const StylePanel = ({ onBack }: StylePanelProps) => {
  const { theme, setTheme } = useTheme();
  const {
    messageAlignment, setMessageAlignment,
    chatStyle, setChatStyle,
    showTimestamps, setShowTimestamps
  } = useChatAppearance();

  // Group themes into light and dark categories
  const themes = [
    // Light themes
    { id: 'light', name: 'Light', color: '#ffffff', textColor: '#111827', category: 'light' },
    { id: 'light-blue', name: 'Light Blue', color: '#f0f9ff', textColor: '#0c4a6e', category: 'light' },
    { id: 'light-green', name: 'Light Green', color: '#f0fdf4', textColor: '#14532d', category: 'light' },

    // Dark themes
    { id: 'dark', name: 'Dark', color: '#121826', textColor: '#f8fafc', category: 'dark' },
    { id: 'blue', name: 'Dark Blue', color: '#0f2b5a', textColor: '#e0f2ff', category: 'dark' },
    { id: 'purple', name: 'Dark Purple', color: '#4c1d95', textColor: '#f5f3ff', category: 'dark' },
    { id: 'red', name: 'Dark Red', color: '#9f1239', textColor: '#ffe4e6', category: 'dark' },
  ];

  // Apply theme change
  const handleThemeChange = (themeId: string) => {
    const validTheme = themeId as 'light' | 'dark' | 'light-blue' | 'light-green' | 'blue' | 'purple' | 'red';
    setTheme(validTheme);

    // Force update the HTML class for immediate visual feedback
    document.documentElement.classList.remove(
      'light', 'dark', 'light-blue', 'light-green', 'blue', 'purple', 'red'
    );
    document.documentElement.classList.add(validTheme);

    // Log theme change for debugging
    console.log('Theme changed to:', validTheme);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full mr-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Button>
          <h2 className="font-medium">Style</h2>
        </div>
      </div>

      {/* Theme Selection */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Light Themes */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Light Themes</h3>
            <div className="grid grid-cols-3 gap-3">
              {themes
                .filter(item => item.category === 'light')
                .map((item) => (
                  <button
                    key={item.id}
                    className={`relative h-20 rounded-lg border ${theme === item.id ? 'border-primary' : 'border-border/50'} overflow-hidden transition-all`}
                    onClick={() => handleThemeChange(item.id)}
                    style={{ backgroundColor: item.color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ color: item.textColor }} className="font-medium">
                        {item.name}
                      </span>
                    </div>
                    {theme === item.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
              ))}
            </div>
          </div>

          {/* Dark Themes */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Dark Themes</h3>
            <div className="grid grid-cols-3 gap-3">
              {themes
                .filter(item => item.category === 'dark')
                .map((item) => (
                  <button
                    key={item.id}
                    className={`relative h-20 rounded-lg border ${theme === item.id ? 'border-primary' : 'border-border/50'} overflow-hidden transition-all`}
                    onClick={() => handleThemeChange(item.id)}
                    style={{ backgroundColor: item.color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ color: item.textColor }} className="font-medium">
                        {item.name}
                      </span>
                    </div>
                    {theme === item.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Chat Appearance</h3>
            <div className="space-y-3">
              {/* Chat Style / Bubble Style */}
              <div className="p-4 rounded-lg border border-border/50 bg-card/30 flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                  <span>Bubble Style</span>
                </div>
                <Select
                  value={chatStyle}
                  onValueChange={(value) => setChatStyle(value as ChatStyle)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message Alignment */}
              <div className="p-4 rounded-lg border border-border/50 bg-card/30 flex items-center justify-between">
                <div className="flex items-center">
                  <AlignLeft className="h-4 w-4 mr-2 text-primary" />
                  <span>Message Alignment</span>
                </div>
                <Select
                  value={messageAlignment}
                  onValueChange={(value) => setMessageAlignment(value as MessageAlignment)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="by-role">By Role</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show Timestamps */}
              <div className="p-4 rounded-lg border border-border/50 bg-card/30 flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-primary" />
                  <span>Show Timestamps</span>
                </div>
                <Switch
                  checked={showTimestamps}
                  onCheckedChange={setShowTimestamps}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default StylePanel;
