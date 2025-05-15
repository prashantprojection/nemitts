import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Toast functionality removed
import { Save, Loader2 } from "lucide-react";
import twitchAuthService from "@/services/twitch/TwitchAuthService";
import { supabase } from "@/integrations/supabase/client";

interface TwitchIntegrationSettings {
  channelPointsEnabled: boolean;
  channelPointsRewardId: string;
  channelPointsMessage: string;
  channelPointsRedemptionType: 'time' | 'messages';
  channelPointsTimeAmount: number;
  channelPointsTimeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  channelPointsMessageCount: number;
  channelPointsStackRedemptions: boolean;
  bitsEnabled: boolean;
  bitsMinimum: number;
  bitsMessage: string;
  bitsRedemptionType: 'time' | 'messages';
  bitsTimeAmount: number;
  bitsTimeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  bitsMessageCount: number;
  bitsStackRedemptions: boolean;
}

const defaultSettings: TwitchIntegrationSettings = {
  channelPointsEnabled: false,
  channelPointsRewardId: "",
  channelPointsMessage: "Channel points redeemed by {username} with message: {message}",
  channelPointsRedemptionType: 'time',
  channelPointsTimeAmount: 1,
  channelPointsTimeUnit: 'hours',
  channelPointsMessageCount: 10,
  channelPointsStackRedemptions: true,
  bitsEnabled: false,
  bitsMinimum: 100,
  bitsMessage: "{username} cheered {bits} bits with message: {message}",
  bitsRedemptionType: 'time',
  bitsTimeAmount: 1,
  bitsTimeUnit: 'hours',
  bitsMessageCount: 10,
  bitsStackRedemptions: true
};

const TwitchIntegrationSettings = () => {
  const [settings, setSettings] = useState<TwitchIntegrationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // First try to load from localStorage for immediate access
        try {
          const localSettings = localStorage.getItem('twitch_integration_settings');
          if (localSettings) {
            const parsedSettings = JSON.parse(localSettings);
            setSettings({
              channelPointsEnabled: parsedSettings.channelPointsEnabled || false,
              channelPointsRewardId: parsedSettings.channelPointsRewardId || "",
              channelPointsMessage: parsedSettings.channelPointsMessage || defaultSettings.channelPointsMessage,
              channelPointsRedemptionType: parsedSettings.channelPointsRedemptionType || 'time',
              channelPointsTimeAmount: parsedSettings.channelPointsTimeAmount || 1,
              channelPointsTimeUnit: parsedSettings.channelPointsTimeUnit || 'hours',
              channelPointsMessageCount: parsedSettings.channelPointsMessageCount || 10,
              channelPointsStackRedemptions: parsedSettings.channelPointsStackRedemptions !== false,
              bitsEnabled: parsedSettings.bitsEnabled || false,
              bitsMinimum: parsedSettings.bitsMinimum || 100,
              bitsMessage: parsedSettings.bitsMessage || defaultSettings.bitsMessage,
              bitsRedemptionType: parsedSettings.bitsRedemptionType || 'time',
              bitsTimeAmount: parsedSettings.bitsTimeAmount || 1,
              bitsTimeUnit: parsedSettings.bitsTimeUnit || 'hours',
              bitsMessageCount: parsedSettings.bitsMessageCount || 10,
              bitsStackRedemptions: parsedSettings.bitsStackRedemptions !== false
            });
          }
        } catch (localError) {
          console.error("Error loading from localStorage:", localError);
        }

        // Then check Supabase for potentially newer settings
        const authState = twitchAuthService.getAuthState();
        setIsAuthenticated(authState.isLoggedIn);

        if (authState.isLoggedIn) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data, error } = await supabase
              .from('twitch_integration_settings')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              console.error("Error loading Twitch integration settings:", error);
              // Show notification in status bar instead of toast
              window.dispatchEvent(new CustomEvent('status-notification', {
                detail: {
                  type: 'error',
                  message: 'Failed to load Twitch integration settings'
                }
              }));
            }

            if (data) {
              // Only use Supabase data if we don't have local settings
              const localSettings = localStorage.getItem('twitch_integration_settings');
              let useSupabaseData = !localSettings;

              if (useSupabaseData) {
                const supabaseSettings = {
                  channelPointsEnabled: data.channel_points_enabled || false,
                  channelPointsRewardId: data.channel_points_reward_id || "",
                  channelPointsMessage: data.channel_points_message || defaultSettings.channelPointsMessage,
                  channelPointsRedemptionType: data.channel_points_redemption_type || 'time',
                  channelPointsTimeAmount: data.channel_points_time_amount || 1,
                  channelPointsTimeUnit: data.channel_points_time_unit || 'hours',
                  channelPointsMessageCount: data.channel_points_message_count || 10,
                  channelPointsStackRedemptions: data.channel_points_stack_redemptions !== false, // default to true
                  bitsEnabled: data.bits_enabled || false,
                  bitsMinimum: data.bits_minimum || 100,
                  bitsMessage: data.bits_message || defaultSettings.bitsMessage,
                  bitsRedemptionType: data.bits_redemption_type || 'time',
                  bitsTimeAmount: data.bits_time_amount || 1,
                  bitsTimeUnit: data.bits_time_unit || 'hours',
                  bitsMessageCount: data.bits_message_count || 10,
                  bitsStackRedemptions: data.bits_stack_redemptions !== false // default to true
                };

                setSettings(supabaseSettings);

                // Update localStorage with the Supabase data
                localStorage.setItem('twitch_integration_settings', JSON.stringify(supabaseSettings));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading Twitch integration settings:", error);
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'error',
            message: 'Failed to load Twitch integration settings'
          }
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // First save to localStorage for immediate access
      try {
        localStorage.setItem('twitch_integration_settings', JSON.stringify(settings));
      } catch (localError) {
        console.error("Error saving to localStorage:", localError);
      }

      // Then save to Supabase if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'error',
            message: 'You must be logged in to save settings'
          }
        }));
        return;
      }

      const { error } = await supabase
        .from('twitch_integration_settings')
        .upsert({
          user_id: user.id,
          channel_points_enabled: settings.channelPointsEnabled,
          channel_points_reward_id: settings.channelPointsRewardId,
          channel_points_message: settings.channelPointsMessage,
          channel_points_redemption_type: settings.channelPointsRedemptionType,
          channel_points_time_amount: settings.channelPointsTimeAmount,
          channel_points_time_unit: settings.channelPointsTimeUnit,
          channel_points_message_count: settings.channelPointsMessageCount,
          channel_points_stack_redemptions: settings.channelPointsStackRedemptions,
          bits_enabled: settings.bitsEnabled,
          bits_minimum: settings.bitsMinimum,
          bits_message: settings.bitsMessage,
          bits_redemption_type: settings.bitsRedemptionType,
          bits_time_amount: settings.bitsTimeAmount,
          bits_time_unit: settings.bitsTimeUnit,
          bits_message_count: settings.bitsMessageCount,
          bits_stack_redemptions: settings.bitsStackRedemptions,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error saving Twitch integration settings:", error);
        // Show notification in status bar instead of toast
        window.dispatchEvent(new CustomEvent('status-notification', {
          detail: {
            type: 'error',
            message: 'Failed to save Twitch integration settings'
          }
        }));
        return;
      }

      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'success',
          message: 'Twitch integration settings saved successfully'
        }
      }));
    } catch (error) {
      console.error("Error saving Twitch integration settings:", error);
      // Show notification in status bar instead of toast
      window.dispatchEvent(new CustomEvent('status-notification', {
        detail: {
          type: 'error',
          message: 'Failed to save Twitch integration settings'
        }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof TwitchIntegrationSettings>(
    key: K,
    value: TwitchIntegrationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Twitch Integration</CardTitle>
          <CardDescription>
            Connect your Twitch channel points and bits to TTS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              You need to log in with Twitch to use these features
            </p>
            <Button onClick={() => twitchAuthService.login()}>
              Log in with Twitch
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Twitch Integration</CardTitle>
        <CardDescription>
          Connect your Twitch channel points and bits to TTS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="channel-points">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="channel-points">Channel Points</TabsTrigger>
            <TabsTrigger value="bits">Bits</TabsTrigger>
          </TabsList>

          <TabsContent value="channel-points" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="channel-points-enabled" className="text-base">Enable Channel Points</Label>
                <p className="text-sm text-muted-foreground">
                  Allow viewers to redeem channel points for TTS messages
                </p>
              </div>
              <Switch
                id="channel-points-enabled"
                checked={settings.channelPointsEnabled}
                onCheckedChange={(checked) => updateSetting('channelPointsEnabled', checked)}
              />
            </div>

            {settings.channelPointsEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="channel-points-reward-id">Channel Points Reward ID</Label>
                  <Input
                    id="channel-points-reward-id"
                    placeholder="Enter your custom reward ID"
                    value={settings.channelPointsRewardId}
                    onChange={(e) => updateSetting('channelPointsRewardId', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a custom reward in your Twitch dashboard and enter its ID here.
                    You can find the ID by creating a reward and checking the URL.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel-points-message">Message Template</Label>
                  <Input
                    id="channel-points-message"
                    placeholder="Enter message template"
                    value={settings.channelPointsMessage}
                    onChange={(e) => updateSetting('channelPointsMessage', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{username}"} for the user's name and {"{message}"} for their message
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Redemption Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={settings.channelPointsRedemptionType === 'time' ? "default" : "outline"}
                      onClick={() => updateSetting('channelPointsRedemptionType', 'time')}
                      className="w-full"
                    >
                      Time-based
                    </Button>
                    <Button
                      type="button"
                      variant={settings.channelPointsRedemptionType === 'messages' ? "default" : "outline"}
                      onClick={() => updateSetting('channelPointsRedemptionType', 'messages')}
                      className="w-full"
                    >
                      Message-based
                    </Button>
                  </div>
                </div>

                {settings.channelPointsRedemptionType === 'time' ? (
                  <div className="space-y-2">
                    <Label htmlFor="channel-points-time-amount">Time Duration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="channel-points-time-amount"
                        type="number"
                        min={1}
                        value={settings.channelPointsTimeAmount}
                        onChange={(e) => updateSetting('channelPointsTimeAmount', parseInt(e.target.value) || 1)}
                      />
                      <select
                        id="channel-points-time-unit"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={settings.channelPointsTimeUnit}
                        onChange={(e) => updateSetting('channelPointsTimeUnit', e.target.value as any)}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long the user will have TTS enabled after redeeming
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="channel-points-message-count">Message Count</Label>
                    <Input
                      id="channel-points-message-count"
                      type="number"
                      min={1}
                      value={settings.channelPointsMessageCount}
                      onChange={(e) => updateSetting('channelPointsMessageCount', parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many messages the user can have read aloud after redeeming
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="channel-points-stack"
                    checked={settings.channelPointsStackRedemptions}
                    onCheckedChange={(checked) => updateSetting('channelPointsStackRedemptions', checked)}
                  />
                  <Label htmlFor="channel-points-stack">Stack Redemptions</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, multiple redemptions will stack (extend time or add more messages)
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="bits" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="bits-enabled" className="text-base">Enable Bits TTS</Label>
                <p className="text-sm text-muted-foreground">
                  Read messages when viewers cheer with bits
                </p>
              </div>
              <Switch
                id="bits-enabled"
                checked={settings.bitsEnabled}
                onCheckedChange={(checked) => updateSetting('bitsEnabled', checked)}
              />
            </div>

            {settings.bitsEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bits-minimum">Minimum Bits</Label>
                  <Input
                    id="bits-minimum"
                    type="number"
                    min={1}
                    placeholder="Minimum bits required"
                    value={settings.bitsMinimum}
                    onChange={(e) => updateSetting('bitsMinimum', parseInt(e.target.value) || 100)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum number of bits required to trigger TTS
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bits-message">Message Template</Label>
                  <Input
                    id="bits-message"
                    placeholder="Enter message template"
                    value={settings.bitsMessage}
                    onChange={(e) => updateSetting('bitsMessage', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{username}"} for the user's name, {"{bits}"} for the bit amount, and {"{message}"} for their message
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Redemption Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={settings.bitsRedemptionType === 'time' ? "default" : "outline"}
                      onClick={() => updateSetting('bitsRedemptionType', 'time')}
                      className="w-full"
                    >
                      Time-based
                    </Button>
                    <Button
                      type="button"
                      variant={settings.bitsRedemptionType === 'messages' ? "default" : "outline"}
                      onClick={() => updateSetting('bitsRedemptionType', 'messages')}
                      className="w-full"
                    >
                      Message-based
                    </Button>
                  </div>
                </div>

                {settings.bitsRedemptionType === 'time' ? (
                  <div className="space-y-2">
                    <Label htmlFor="bits-time-amount">Time Duration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="bits-time-amount"
                        type="number"
                        min={1}
                        value={settings.bitsTimeAmount}
                        onChange={(e) => updateSetting('bitsTimeAmount', parseInt(e.target.value) || 1)}
                      />
                      <select
                        id="bits-time-unit"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={settings.bitsTimeUnit}
                        onChange={(e) => updateSetting('bitsTimeUnit', e.target.value as any)}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long the user will have TTS enabled after cheering
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="bits-message-count">Message Count</Label>
                    <Input
                      id="bits-message-count"
                      type="number"
                      min={1}
                      value={settings.bitsMessageCount}
                      onChange={(e) => updateSetting('bitsMessageCount', parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many messages the user can have read aloud after cheering
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="bits-stack"
                    checked={settings.bitsStackRedemptions}
                    onCheckedChange={(checked) => updateSetting('bitsStackRedemptions', checked)}
                  />
                  <Label htmlFor="bits-stack">Stack Redemptions</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, multiple bit donations will stack (extend time or add more messages)
                </p>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwitchIntegrationSettings;
