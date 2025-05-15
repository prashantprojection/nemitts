import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserRound, Pencil, Trash2, Plus, Save } from "lucide-react";
import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import { UserNickname } from "@/services/speech/types";

const NicknameSettings = () => {
  const { settings, updateSetting } = useFilterSettingsContext();

  // Local state for the nickname being added/edited
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Get the userNicknames from settings or default to empty array
  const userNicknames = settings.userNicknames || [];

  // Handle adding a new nickname
  const handleAddNickname = () => {
    if (!username.trim() || !nickname.trim()) return;

    const newNicknames = [...userNicknames];

    if (editingIndex !== null) {
      // Update existing nickname
      newNicknames[editingIndex] = { username: username.trim(), nickname: nickname.trim() };
    } else {
      // Add new nickname
      newNicknames.push({ username: username.trim(), nickname: nickname.trim() });
    }

    updateSetting('userNicknames', newNicknames);

    // Reset form
    setUsername("");
    setNickname("");
    setEditingIndex(null);
  };

  // Handle editing a nickname
  const handleEditNickname = (index: number) => {
    const nicknameToEdit = userNicknames[index];
    setUsername(nicknameToEdit.username);
    setNickname(nicknameToEdit.nickname);
    setEditingIndex(index);
  };

  // Handle deleting a nickname
  const handleDeleteNickname = (index: number) => {
    const newNicknames = [...userNicknames];
    newNicknames.splice(index, 1);
    updateSetting('userNicknames', newNicknames);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Nickname Settings</CardTitle>
          <CardDescription>
            Configure nicknames for users in TTS
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            {userNicknames.length} {userNicknames.length === 1 ? 'nickname' : 'nicknames'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="use-nicknames"
            checked={settings.useNicknames || false}
            onCheckedChange={(checked) => updateSetting('useNicknames', checked)}
          />
          <Label htmlFor="use-nicknames">Use nicknames instead of usernames when speaking</Label>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter Twitch username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="Enter nickname to use"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleAddNickname}
            className="w-full"
            disabled={!username.trim() || !nickname.trim()}
          >
            {editingIndex !== null ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Nickname
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Nickname
              </>
            )}
          </Button>
        </div>

        {userNicknames.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userNicknames.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.username}</TableCell>
                  <TableCell>{item.nickname}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditNickname(index)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteNickname(index)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No nicknames added yet. Add your first nickname above.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NicknameSettings;
