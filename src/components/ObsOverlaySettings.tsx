import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/color-picker";
import { Copy, ExternalLink, Save } from "lucide-react";
// Toast functionality removed
// PresetManager removed
import TabContainer from "./layout/TabContainer";
import Section from "./layout/Section";
import { useThemeSettingsContext } from "@/hooks/useThemeSettingsContext";

const ObsOverlaySettings = () => {
  const {
    settings,
    updateSetting,
    saveSettings,
    resetToDefaults,
    generateUrl,
    isLoading,
    isSaving
  } = useThemeSettingsContext();

  // Generate URL for OBS Browser Source
  const obsUrl = generateUrl();

  const handleSaveSettings = async () => {
    await saveSettings();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'success',
            message: 'OBS URL copied to clipboard'
          }
        }));
      })
      .catch(() => {
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'error',
            message: 'Failed to copy to clipboard'
          }
        }));
      });
  };

  const openObsView = () => {
    // Force a save before opening the preview
    saveSettings().then(() => {
      // Use a small delay to ensure settings are saved
      setTimeout(() => {
        window.open(obsUrl, '_blank');
      }, 100);
    });
  };

  if (isLoading) {
    return <div className="text-center py-6">Loading OBS overlay settings...</div>;
  }

  // Define the settings tabs
  const settingsTabs = [
    {
      value: "general",
      label: "General",
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={settings.width}
                  onChange={(e) => updateSetting('width', parseInt(e.target.value) || 800)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={settings.height}
                  onChange={(e) => updateSetting('height', parseInt(e.target.value) || 200)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-queue">Show Queue</Label>
                <Switch
                  id="show-queue"
                  checked={settings.showQueue}
                  onCheckedChange={(checked) => updateSetting('showQueue', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Show upcoming messages in the queue
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-queue-items">Maximum Queue Items</Label>
              <Input
                id="max-queue-items"
                type="number"
                value={settings.maxQueueItems}
                onChange={(e) => updateSetting('maxQueueItems', parseInt(e.target.value) || 3)}
                min={1}
                max={10}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of upcoming messages to show in the queue
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-speaking-indicator">Speaking Indicator</Label>
                <Switch
                  id="show-speaking-indicator"
                  checked={settings.showSpeakingIndicator}
                  onCheckedChange={(checked) => updateSetting('showSpeakingIndicator', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Show animated speaking indicator when TTS is active
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      value: "appearance",
      label: "Appearance",
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size (px)</Label>
              <Input
                id="font-size"
                type="number"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value) || 16)}
                min={10}
                max={32}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting('fontFamily', value)}
              >
                <SelectTrigger id="font-family">
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="'Comic Sans MS', cursive">Comic Sans MS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="border-radius">Border Radius (px)</Label>
              <Slider
                id="border-radius"
                min={0}
                max={20}
                step={1}
                value={[settings.borderRadius]}
                onValueChange={([value]) => updateSetting('borderRadius', value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Square</span>
                <span>Rounded</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="text-color">Text Color</Label>
                <ColorPicker
                  id="text-color"
                  color={settings.textColor}
                  onChange={(color) => updateSetting('textColor', color)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="background-color">Background Color</Label>
                <ColorPicker
                  id="background-color"
                  color={settings.backgroundColor}
                  onChange={(color) => updateSetting('backgroundColor', color)}
                  allowAlpha
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent Color</Label>
                <ColorPicker
                  id="accent-color"
                  color={settings.accentColor}
                  onChange={(color) => updateSetting('accentColor', color)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      value: "animation",
      label: "Animation",
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Animation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="animation-type">Animation Type</Label>
              <Select
                value={settings.animation}
                onValueChange={(value) => updateSetting('animation', value)}
              >
                <SelectTrigger id="animation-type">
                  <SelectValue placeholder="Select animation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Animation effect when new messages appear
              </p>
            </div>

            <div className="p-4 border rounded-md bg-muted/50">
              <h4 className="font-medium mb-2">Animation Preview</h4>
              <div className={`p-3 border rounded-md bg-card ${settings.animation !== 'none' ? `animate-${settings.animation}-in` : ''}`}>
                <div className="font-medium">Example Message</div>
                <div className="text-sm">This is how animations will look</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      value: "advanced",
      label: "Advanced",
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-css">Custom CSS</Label>
              <textarea
                id="custom-css"
                className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                value={settings.customCSS}
                onChange={(e) => updateSetting('customCSS', e.target.value)}
                placeholder=".obs-container { /* your custom styles */ }"
              />
              <p className="text-xs text-muted-foreground">
                Add custom CSS to further customize the appearance of the overlay.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    },
    // Presets tab removed
  ];

  return (
    <div className="space-y-6">
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="obs-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
              disabled={isSaving}
            />
            <Label htmlFor="obs-enabled">Enable OBS Browser Source</Label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
            >
              Reset to Defaults
            </Button>

            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </Section>

      {settings.enabled && (
        <>
          <Section>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Browser Source URL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="obs-url">URL for OBS Browser Source</Label>
                  <div className="flex gap-2">
                    <Input
                      id="obs-url"
                      value={obsUrl}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(obsUrl)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this URL in OBS as a Browser Source
                  </p>
                </div>

                <Button
                  onClick={openObsView}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview OBS View
                </Button>
              </CardContent>
            </Card>
          </Section>

          <Section title="Overlay Settings">
            <TabContainer tabs={settingsTabs} defaultValue="general" />
          </Section>

          <Section>
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-medium mb-2">How to Set Up in OBS</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                <li>In OBS, add a new "Browser" source</li>
                <li>Copy the URL above and paste it into the URL field</li>
                <li>Set width to {settings.width} and height to {settings.height}</li>
                <li>Enable "Control audio via OBS"</li>
                <li>Click OK to add the browser source</li>
                <li>Position and resize the source as needed</li>
              </ol>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export default ObsOverlaySettings;
