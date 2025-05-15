import React, { useState, useEffect } from 'react';
import { UserVoiceAssignment } from "@/services/speech/types";
import speechService from "@/services/SpeechService";
import LocalStorageManager from "@/services/LocalStorageManager";
import UserVoiceForm from "./UserVoiceForm";
import UserVoiceTable from "./UserVoiceTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Users, User, UserPlus, UserCheck, Info, X, Plus } from "lucide-react";
import twitchAuthService from "@/services/twitch/TwitchAuthService";

const UserVoiceAssignmentsGrid = () => {
  const [userVoiceAssignments, setUserVoiceAssignments] = useState<UserVoiceAssignment[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<UserVoiceAssignment | null>(null);

  // We've removed Twitch-specific states as they'll be handled in the AllowedUsersGrid component

  // No voice limit
  const hasReachedLimit = false;

  // Auto-save timeout reference
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // Load available voices
        setVoices(speechService.getVoices());

        // Load user voice assignments
        const options = await speechService.getOptions();
        if (options.userVoiceAssignments && options.userVoiceAssignments.length > 0) {
          // Filter out special assignments (those starting with @) as they'll be handled in AllowedUsersGrid
          const individualAssignments = options.userVoiceAssignments.filter(a => !a.username.startsWith('@'));
          setUserVoiceAssignments(individualAssignments);
        } else {
          // Try to load directly from LocalStorageManager
          try {
            const localAssignments = LocalStorageManager.loadUserVoiceAssignments();

            if (localAssignments && localAssignments.length > 0) {
              // Filter out special assignments
              const individualAssignments = localAssignments.filter(a => !a.username.startsWith('@'));
              setUserVoiceAssignments(individualAssignments);

              // Also update the speech service with these assignments
              // Note: We keep all assignments in the speech service, including Twitch ones
              speechService.setOptions({
                ...options,
                userVoiceAssignments: localAssignments
              });
            }
          } catch (error) {
            console.error("Error loading voice assignments from localStorage:", error);
          }
        }
      } catch (error) {
        console.error("Error loading voice settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Auto-save when assignments change
  useEffect(() => {
    if (isLoading) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set a new timeout to save after 1 second of inactivity
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const currentOptions = await speechService.getOptions();

        // Get all existing voice assignments including special ones (starting with @)
        const specialAssignments = (currentOptions.userVoiceAssignments || []).filter(a => a.username.startsWith('@'));

        // Combine individual assignments with special assignments
        const combinedAssignments = [...userVoiceAssignments, ...specialAssignments];

        // First apply the settings immediately to ensure they take effect
        speechService.setOptions({
          ...currentOptions,
          userVoiceAssignments: combinedAssignments
        });

        // Then save them to persistent storage
        await speechService.saveSettings({
          ...currentOptions,
          userVoiceAssignments: combinedAssignments
        });

        // Also save to local storage directly
        LocalStorageManager.saveUserVoiceAssignments(combinedAssignments);
      } catch (error) {
        console.error("Error auto-saving voice assignments:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    // Clean up the timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [userVoiceAssignments, isLoading]);

  const addVoiceAssignment = (assignment: UserVoiceAssignment) => {
    // Check if this username already exists
    const existingIndex = userVoiceAssignments.findIndex(
      a => a.username.toLowerCase() === assignment.username.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      const updatedAssignments = [...userVoiceAssignments];
      updatedAssignments[existingIndex] = assignment;
      setUserVoiceAssignments(updatedAssignments);
    } else {
      // Add new assignment
      setUserVoiceAssignments(prev => [...prev, assignment]);
    }
  };

  const updateVoiceAssignment = (index: number, assignment: UserVoiceAssignment) => {
    const updatedAssignments = [...userVoiceAssignments];
    updatedAssignments[index] = assignment;
    setUserVoiceAssignments(updatedAssignments);
    setEditingIndex(null);
    setEditingAssignment(null);
  };

  const removeVoiceAssignment = (username: string) => {
    setUserVoiceAssignments(prev =>
      prev.filter(assignment => assignment.username !== username)
    );
  };

  const handleEditAssignment = (index: number) => {
    setEditingIndex(index);
    setEditingAssignment(userVoiceAssignments[index]);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingAssignment(null);
  };

  const testVoice = (assignment: UserVoiceAssignment) => {
    speechService.speak(`This is a test of ${assignment.username}'s voice.`, {
      voice: speechService.getVoiceByName(assignment.voiceName),
      rate: assignment.rate || 1,
      pitch: assignment.pitch || 1,
      volume: assignment.volume || 1
    });
  };

  // Removed handleTwitchVoiceChange as it's now handled in AllowedUsersGrid

  if (isLoading) {
    return <div className="text-center py-6">Loading voice assignments...</div>;
  }

  // Filter out special assignments (those starting with @)
  const individualAssignments = userVoiceAssignments.filter(a => !a.username.startsWith('@'));

  return (
    <div className="space-y-8 w-full">
      <div className="card p-6 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium">Individual User Voice Assignments</h3>
            <p className="text-sm text-muted-foreground truncate" title="Assign specific voices to individual users">Assign specific voices to individual users</p>
          </div>
        </div>

        <UserVoiceForm
          voices={voices}
          onAddAssignment={addVoiceAssignment}
          onUpdateAssignment={updateVoiceAssignment}
          editingAssignment={editingAssignment}
          editingIndex={editingIndex}
          onCancelEdit={handleCancelEdit}
          disabled={hasReachedLimit && editingIndex === null}
        />

        <div className="mt-6">
          {individualAssignments.length > 0 ? (
            <UserVoiceTable
              assignments={individualAssignments}
              onEdit={handleEditAssignment}
              onDelete={removeVoiceAssignment}
              onTest={testVoice}
            />
          ) : (
            <div className="text-center py-6 border rounded-md bg-muted/20">
              <p className="text-muted-foreground">No voice assignments yet. Add one above.</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md mt-6">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Individual voice assignments will override Twitch user group assignments. Configure Twitch user group voices in the Allowed Users section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserVoiceAssignmentsGrid;
