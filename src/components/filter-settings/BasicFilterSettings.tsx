import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, MessageSquare, Link2, Bot, Clock, Hash, UserMinus, Plus, X } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";

const FilterSettings = () => {
  const [newExcludedUser, setNewExcludedUser] = useState("");
  const { settings, updateSetting } = useFilterSettingsContext();

  // Function to create a filter option with tooltip
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtering Options</CardTitle>
        <CardDescription>
          Configure how messages are filtered before being read aloud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <Card className="border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4" /> Message Length Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-2">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-length" className="text-xs font-medium">Maximum Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  value={settings.maxMessageLength}
                  onChange={(e) => updateSetting('maxMessageLength', parseInt(e.target.value) || 0)}
                  min={0}
                  max={1000}
                  className="h-8"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Messages outside these limits will be skipped. Set to 0 to disable the limit.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> User Cooldown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{settings.userCooldown} seconds</span>
                <Badge variant={settings.userCooldown > 0 ? "default" : "outline"}>
                  {settings.userCooldown > 0 ? "Enabled" : "Disabled"}
                </Badge>
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
              <p className="text-xs text-muted-foreground">
                Minimum time between messages from the same user. Set to 0 to disable.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Excluded Users Section */}
        <Card className="border-dashed">
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserMinus className="h-4 w-4" /> Excluded Users
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Messages from these users will never be read aloud.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter username to exclude"
                  value={newExcludedUser}
                  onChange={(e) => setNewExcludedUser(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newExcludedUser.trim()) {
                      addToListSetting('excludedUsernames', newExcludedUser.trim().toLowerCase());
                      setNewExcludedUser("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (newExcludedUser.trim()) {
                      addToListSetting('excludedUsernames', newExcludedUser.trim().toLowerCase());
                      setNewExcludedUser("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {settings.excludedUsernames?.length > 0 ? (
                  settings.excludedUsernames.map((username) => (
                    <Badge key={username} variant="secondary" className="flex items-center gap-1">
                      {username}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeFromListSetting('excludedUsernames', username)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No excluded users. Add usernames above to exclude them from TTS.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default FilterSettings;
