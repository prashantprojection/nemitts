// This file is a replacement for the Supabase client
// It uses localStorage to store and retrieve data
import { localStorageClient } from '@/lib/localStorageClient';

// Import the local storage client like this:
// import { supabase } from "@/integrations/supabase/client";

// Export the local storage client as a drop-in replacement for Supabase
export const supabase = localStorageClient;