import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Keyboard, HelpCircle } from "lucide-react";
import { useKeyboardShortcuts } from "@/contexts/KeyboardShortcutContext";

interface HotkeyInfo {
  shortcut: string;
  description: string;
  category?: string;
}

interface HotkeySettingsProps {
  hotkeys?: HotkeyInfo[];
}

const HotkeySettings = ({ hotkeys = [] }: HotkeySettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { shortcuts, isEnabled, setIsEnabled, showOverlay } = useKeyboardShortcuts();

  // Combine passed hotkeys with registered shortcuts
  const allHotkeys = [...hotkeys, ...shortcuts.map(s => ({
    shortcut: s.shortcut,
    description: s.description,
    category: s.category
  }))];

  const handleToggle = (checked: boolean) => {
    setIsLoading(true);
    try {
      // Update the global keyboard shortcut state
      setIsEnabled(checked);
      console.log(`Keyboard shortcuts ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error saving hotkey settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="hotkeys-enabled"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
          <Label htmlFor="hotkeys-enabled">Enable keyboard shortcuts</Label>
        </div>

        {isEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => showOverlay()}
            className="flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Show All Shortcuts
          </Button>
        )}
      </div>

      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Common Shortcuts
            </CardTitle>
            <CardDescription>
              Press <kbd className="px-1 py-0.5 text-xs bg-muted border rounded-md">Shift</kbd> + <kbd className="px-1 py-0.5 text-xs bg-muted border rounded-md">?</kbd> at any time to show all shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allHotkeys.slice(0, 5).map((hotkey, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{hotkey.description}</span>
                  <div className="flex gap-1">
                    {hotkey.shortcut.split("+").map((key, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-1 text-xs font-semibold bg-muted border rounded-md shadow-sm"
                      >
                        {key.trim()}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
              {allHotkeys.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => showOverlay()}
                >
                  Show {allHotkeys.length - 5} more shortcuts...
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HotkeySettings;
