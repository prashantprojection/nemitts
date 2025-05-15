
import { AuthState } from "./types";

// This function is now a no-op since we're using localStorage instead of Supabase
export const updateUserSettings = async (authState: AuthState): Promise<void> => {
  // Settings are now stored in localStorage via the SettingsService
  // No need to update Supabase
  console.log("User settings updated locally", authState.channelName);
};
