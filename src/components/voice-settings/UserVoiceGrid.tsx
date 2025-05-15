import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Users, User, UserPlus, UserCheck, Info } from "lucide-react";
import SettingsGrid from '@/components/settings/SettingsGrid';
import SettingsPanel from '@/components/settings/SettingsPanel';
import UserVoiceForm from './UserVoiceForm';
import UserVoiceTable from './UserVoiceTable';
import { UserVoiceAssignment } from '@/services/speech/types';

interface UserVoiceGridProps {
  voices: SpeechSynthesisVoice[];
  userVoiceAssignments: UserVoiceAssignment[];
  onAddAssignment: (assignment: UserVoiceAssignment) => void;
  onUpdateAssignment: (index: number, assignment: UserVoiceAssignment) => void;
  onDeleteAssignment: (username: string) => void;
  onTestVoice: (assignment: UserVoiceAssignment) => void;
  hasReachedLimit: boolean;
}

const UserVoiceGrid = ({
  voices,
  userVoiceAssignments,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onTestVoice,
  hasReachedLimit
}: UserVoiceGridProps) => {
  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<UserVoiceAssignment | null>(null);

  // Handle edit assignment
  const handleEditAssignment = (index: number) => {
    setEditingIndex(index);
    setEditingAssignment(userVoiceAssignments[index]);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingAssignment(null);
  };

  // Filter out special assignments (those starting with @)
  const individualAssignments = userVoiceAssignments.filter(a => !a.username.startsWith('@'));

  return (
    <SettingsGrid columns={2}>
      {/* User Voice Form Panel */}
      <SettingsPanel
        title="Add Voice Assignment"
        description="Assign a voice to a specific user"
        icon={<UserPlus className="h-4 w-4 text-primary" />}
        className="col-span-full max-w-4xl mx-auto"
      >
        <UserVoiceForm
          voices={voices}
          onAddAssignment={onAddAssignment}
          onUpdateAssignment={onUpdateAssignment}
          editingAssignment={editingAssignment}
          editingIndex={editingIndex}
          onCancelEdit={handleCancelEdit}
          disabled={hasReachedLimit && editingIndex === null}
        />
      </SettingsPanel>

      {/* User Voice Table Panel */}
      <SettingsPanel
        title="User Voice Assignments"
        description="Manage voice assignments for individual users"
        icon={<Users className="h-4 w-4 text-primary" />}
        className="col-span-full max-w-4xl mx-auto"
      >
        {individualAssignments.length > 0 ? (
          <UserVoiceTable
            assignments={individualAssignments}
            onEdit={handleEditAssignment}
            onDelete={onDeleteAssignment}
            onTest={onTestVoice}
          />
        ) : (
          <div className="text-center py-6 border rounded-md bg-muted/20">
            <p className="text-muted-foreground">No voice assignments yet. Add one above.</p>
          </div>
        )}
      </SettingsPanel>

      {/* Info Panel */}
      <SettingsPanel
        title="Voice Assignment Information"
        description="How user voice assignments work"
        icon={<Info className="h-4 w-4 text-primary" />}
        className="col-span-full"
      >
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> When a user has a voice assigned, their messages will be read using that voice instead of the general voice. This allows you to create a unique experience for different viewers in your chat.
          </p>
        </div>
      </SettingsPanel>
    </SettingsGrid>
  );
};

export default UserVoiceGrid;
