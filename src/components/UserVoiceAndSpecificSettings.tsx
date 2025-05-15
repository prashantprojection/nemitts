import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserVoiceAssignments from "./UserVoiceAssignments";
import SpecificUsersSettings from "./SpecificUsersSettings";

const UserVoiceAndSpecificSettings = () => {
  const [activeTab, setActiveTab] = useState("voice-assignments");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="voice-assignments" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full bg-muted/30 p-2 gap-2 rounded-lg h-auto">
          <TabsTrigger value="voice-assignments" className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm">Voice Assignments</TabsTrigger>
          <TabsTrigger value="specific-users" className="flex-1 px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm">Specific Users</TabsTrigger>
        </TabsList>

        <TabsContent value="voice-assignments" className="space-y-6 pt-4">
          <UserVoiceAssignments />
        </TabsContent>

        <TabsContent value="specific-users" className="space-y-6 pt-4">
          <SpecificUsersSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserVoiceAndSpecificSettings;
