import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Link2, Bot, Clock, Hash, UserMinus, Info } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import SettingsGrid from '@/components/settings/SettingsGrid';
import SettingsPanel from '@/components/settings/SettingsPanel';

const FilterSettingsGrid = () => {
  const { settings, updateSetting } = useFilterSettingsContext();

  // Function to create a filter option
  const FilterOption = ({ id, title, description, icon: Icon, checked, onChange }: {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor={id} className="font-medium cursor-pointer">{title}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Filters Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Basic Filters</h3>
              <p className="text-sm text-muted-foreground truncate" title="Configure how messages are filtered">Configure how messages are filtered</p>
            </div>
          </div>

          <div className="space-y-3">
            <FilterOption
              id="speak-usernames"
              title="Say Usernames"
              description="Include the username before each message when reading aloud"
              icon={MessageSquare}
              checked={settings.speakUsernames}
              onChange={(checked) => updateSetting('speakUsernames', checked)}
            />

            <FilterOption
              id="skip-emojis"
              title="Skip Emojis"
              description="Skip emojis when reading messages"
              icon={Hash}
              checked={settings.skipEmojisInMessage}
              onChange={(checked) => updateSetting('skipEmojisInMessage', checked)}
            />

            <FilterOption
              id="skip-links"
              title="Skip Links"
              description="Skip URLs and links when reading messages"
              icon={Link2}
              checked={settings.skipLinksInMessage}
              onChange={(checked) => updateSetting('skipLinksInMessage', checked)}
            />

            <FilterOption
              id="skip-bots"
              title="Skip Bot Messages"
              description="Skip messages from known bot accounts"
              icon={Bot}
              checked={settings.skipBotMessages}
              onChange={(checked) => updateSetting('skipBotMessages', checked)}
            />
          </div>
        </div>

        {/* Message Length Limits Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Message Length Limits</h3>
              <p className="text-sm text-muted-foreground truncate" title="Set minimum and maximum message length">Set minimum and maximum message length</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-length" className="text-xs font-medium">Minimum Length</Label>
                <Input
                  id="min-length"
                  type="number"
                  value={settings.minMessageLength}
                  onChange={(e) => updateSetting('minMessageLength', parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum characters required
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-length" className="text-xs font-medium">Maximum Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  value={settings.maxMessageLength}
                  onChange={(e) => updateSetting('maxMessageLength', parseInt(e.target.value) || 1)}
                  min={1}
                  max={1000}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum characters allowed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Cooldown Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">User Cooldown</h3>
              <p className="text-sm text-muted-foreground truncate" title="Set time between messages from the same user">Set time between messages from the same user</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="user-cooldown" className="text-sm font-medium">Cooldown: {settings.userCooldown} seconds</Label>
              </div>
              <Slider
                id="user-cooldown"
                min={0}
                max={60}
                step={1}
                value={[settings.userCooldown]}
                onValueChange={([value]) => updateSetting('userCooldown', value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>No cooldown</span>
                <span>30 seconds</span>
                <span>60 seconds</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Minimum time between messages from the same user. Set to 0 to disable.
              </p>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="card p-6 border rounded-lg bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium">Filter Information</h3>
              <p className="text-sm text-muted-foreground truncate" title="How filters work in the application">How filters work in the application</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-300 line-clamp-2" title="Filters are applied in real-time to all incoming messages. You can configure additional user and word blocklists in the Blocklists section.">
              <strong>Note:</strong> Filters are applied in real-time to all incoming messages. You can configure additional user and word blocklists in the Blocklists section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add the missing Filter icon component
const Filter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default FilterSettingsGrid;
