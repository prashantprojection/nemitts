
import { supabase } from "@/integrations/supabase/client";
import { AuthState } from "./types";

export const updateUserSettings = async (authState: AuthState): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && authState.channelName) {
      const { error } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        channel_name: authState.channelName
      }, { onConflict: 'user_id' });
      
      if (error) {
        console.error("Error updating user settings:", error);
      }
    }
  } catch (err) {
    console.error("Error saving user settings:", err);
  }
};
