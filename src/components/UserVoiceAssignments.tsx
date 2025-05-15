import { useState, useEffect } from "react";
import { UserVoiceAssignment } from "@/services/speech/types";
import speechService from "@/services/SpeechService";
// Toast functionality removed
import LocalStorageManager from "@/services/LocalStorageManager";
import UserVoiceForm from "./voice-settings/UserVoiceForm";
import UserVoiceTable from "./voice-settings/UserVoiceTable";
import UserVoiceGrid from "./voice-settings/UserVoiceGrid";
import TwitchVoiceSettings from "./TwitchVoiceSettings";

// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const UserVoiceAssignments = () => {
  const [userVoiceAssignments, setUserVoiceAssignments] = useState<UserVoiceAssignment[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // We use isSaving in the auto-save effect
  const [isSaving, setIsSaving] = useState(false);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<UserVoiceAssignment | null>(null);

  // No voice limit
  const hasReachedLimit = false;

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // Load available voices
        setVoices(speechService.getVoices());

        // Load user voice assignments
        const options = await speechService.getOptions();
        if (options.userVoiceAssignments && options.userVoiceAssignments.length > 0) {
          setUserVoiceAssignments(options.userVoiceAssignments);

          if (process.env.NODE_ENV === 'development') {
            console.log("Loaded user voice assignments:", options.userVoiceAssignments);
          }
        } else {
          // Try to load directly from LocalStorageManager
          try {
            // LocalStorageManager is now imported statically at the top of the file
            const localAssignments = LocalStorageManager.loadUserVoiceAssignments();

            if (localAssignments && localAssignments.length > 0) {
              setUserVoiceAssignments(localAssignments);

              // Also update the speech service with these assignments
              speechService.setOptions({
                ...options,
                userVoiceAssignments: localAssignments
              });

              if (process.env.NODE_ENV === 'development') {
                console.log("Loaded user voice assignments from localStorage:", localAssignments);
              }
            }
          } catch (error) {
            console.error("Error loading voice assignments from localStorage:", error);
          }
        }
      } catch (error) {
        console.error("Error loading voice assignments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Auto-save is implemented in the useEffect below, so we don't need a separate save function

  // Store the timeout ID for auto-saving
  const autoSaveTimeoutRef = useState<NodeJS.Timeout | null>(null);

  // Auto-save settings whenever they change
  useEffect(() => {
    // Skip if we're loading or if there are no assignments
    if (isLoading || userVoiceAssignments.length === 0) {
      return;
    }

    // Skip if we're already saving
    if (isSaving) {
      return;
    }

    // Create a function to save the settings
    const autoSaveSettings = async () => {
      try {
        setIsSaving(true);
        const currentOptions = await speechService.getOptions();

        // Check if the assignments have actually changed
        const currentAssignments = currentOptions.userVoiceAssignments || [];
        const hasChanged = JSON.stringify(currentAssignments) !== JSON.stringify(userVoiceAssignments);

        if (!hasChanged) {
          if (process.env.NODE_ENV === 'development') {
            console.log('No changes detected in user voice assignments, skipping save');
          }
          setIsSaving(false);
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('Auto-saving user voice assignments:', userVoiceAssignments);
        }

        // First apply the settings immediately to ensure they take effect
        speechService.setOptions({
          ...currentOptions,
          userVoiceAssignments
        });

        // Then save them to persistent storage
        const success = await speechService.saveSettings({
          ...currentOptions,
          userVoiceAssignments
        });

        if (success && process.env.NODE_ENV === 'development') {
          console.log('User voice assignments saved successfully');
        }
      } catch (error) {
        console.error("Error auto-saving voice assignments:", error);
      } finally {
        setIsSaving(false);
      }
    };

    // Clear any existing timeout
    if (autoSaveTimeoutRef[0]) {
      clearTimeout(autoSaveTimeoutRef[0]);
    }

    // Set a new timeout with a longer delay (1000ms instead of 500ms)
    const timeoutId = setTimeout(autoSaveSettings, 1000);
    autoSaveTimeoutRef[0] = timeoutId;

    // Clean up the timeout when the component unmounts
    return () => {
      if (autoSaveTimeoutRef[0]) {
        clearTimeout(autoSaveTimeoutRef[0]);
      }
    };
  }, [userVoiceAssignments]); // Only depend on userVoiceAssignments, not isLoading or isSaving

  const addVoiceAssignment = (assignment: UserVoiceAssignment) => {
    // Check if username already exists
    if (userVoiceAssignments.some(a => a.username.toLowerCase() === assignment.username.toLowerCase())) {
      toast.error("This user already has a voice assignment");
      return;
    }

    // No limit check needed

    setUserVoiceAssignments(prev => [...prev, assignment]);
    toast.success("Voice assignment added");
  };

  const updateVoiceAssignment = (index: number, assignment: UserVoiceAssignment) => {
    // Check if username already exists (except for the current editing item)
    const existingIndex = userVoiceAssignments.findIndex(
      (a, i) => i !== index && a.username.toLowerCase() === assignment.username.toLowerCase()
    );

    if (existingIndex >= 0) {
      toast.error("This user already has a voice assignment");
      return;
    }

    const updatedAssignments = [...userVoiceAssignments];
    updatedAssignments[index] = assignment;

    setUserVoiceAssignments(updatedAssignments);
    setEditingIndex(null);
    setEditingAssignment(null);
    toast.success("Voice assignment updated");
  };

  // Edit an assignment
  const handleEditAssignment = (index: number) => {
    setEditingAssignment(userVoiceAssignments[index]);
    setEditingIndex(index);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingAssignment(null);
  };

  const removeVoiceAssignment = async (username: string) => {
    try {
      // First update the state
      setUserVoiceAssignments(prev =>
        prev.filter(assignment => assignment.username !== username)
      );

      // Then immediately save the changes to ensure they persist
      const currentOptions = await speechService.getOptions();
      const updatedAssignments = currentOptions.userVoiceAssignments?.filter(
        assignment => assignment.username !== username
      ) || [];

      // Apply the changes to the speech service
      speechService.setOptions({
        ...currentOptions,
        userVoiceAssignments: updatedAssignments
      });

      // Save the changes to persistent storage
      await speechService.saveSettings({
        ...currentOptions,
        userVoiceAssignments: updatedAssignments
      });

      toast.success("Voice assignment removed");
    } catch (error) {
      console.error("Error removing voice assignment:", error);
      toast.error("Failed to remove voice assignment");
    }
  };

  const testVoice = (assignment: UserVoiceAssignment) => {
    // Find the voice object by name
    const voice = voices.find(v => v.name === assignment.voiceName);

    if (voice) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create a temporary utterance for testing
      const utterance = new SpeechSynthesisUtterance(`This is a test of ${assignment.username}'s voice`);
      utterance.voice = voice;
      utterance.rate = assignment.rate || 1;
      utterance.pitch = assignment.pitch || 1;
      utterance.volume = assignment.volume || 1;

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Testing user voice with settings:', {
          username: assignment.username,
          voice: voice.name,
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume
        });
      }

      // Speak the test message
      window.speechSynthesis.speak(utterance);
    } else {
      console.error('Voice not found for testing:', assignment.voiceName);
      toast.error(`Voice "${assignment.voiceName}" not found`);
    }
  };

  if (isLoading) {
    return <div className="text-center py-6">Loading voice assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Voice Assignments</h2>
        {/* Voice limit counter removed */}
      </div>

      {/* Subscription limit UI removed */}

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="flex w-full bg-muted/30 p-2 gap-2 rounded-lg h-auto">
          <TabsTrigger value="individual" className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm">Individual Users</TabsTrigger>
          <TabsTrigger value="twitch" className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm">Twitch User Types</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6 pt-4">
          <UserVoiceGrid
            voices={voices}
            userVoiceAssignments={userVoiceAssignments}
            onAddAssignment={addVoiceAssignment}
            onUpdateAssignment={updateVoiceAssignment}
            onDeleteAssignment={removeVoiceAssignment}
            onTestVoice={testVoice}
            hasReachedLimit={hasReachedLimit}
          />
        </TabsContent>

        <TabsContent value="twitch" className="space-y-6 pt-4">
          <TwitchVoiceSettings
            voices={voices}
            userVoiceAssignments={userVoiceAssignments}
            onUpdateAssignments={setUserVoiceAssignments}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserVoiceAssignments;
