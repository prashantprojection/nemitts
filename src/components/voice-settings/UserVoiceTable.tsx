import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserVoiceAssignment } from "@/services/speech/types";
import { Edit, Trash2, Play, Search, MoreHorizontal, ChevronDown, Volume2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserVoiceTableProps {
  assignments: UserVoiceAssignment[];
  onEdit: (index: number) => void;
  onDelete: (username: string) => void;
  onTest: (assignment: UserVoiceAssignment) => void;
}

const UserVoiceTable = ({
  assignments,
  onEdit,
  onDelete,
  onTest
}: UserVoiceTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sortBy, setSortBy] = useState<keyof UserVoiceAssignment>("username");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter assignments based on search query
  const filteredAssignments = assignments.filter(assignment => {
    const query = searchQuery.toLowerCase();
    return (
      assignment.username.toLowerCase().includes(query) ||
      assignment.voiceName.toLowerCase().includes(query)
    );
  });

  // Sort assignments
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    // Default sorting for fields
    const aValue = a[sortBy] as string;
    const bValue = b[sortBy] as string;

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Handle sort click
  const handleSort = (column: keyof UserVoiceAssignment) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAssignments.length === filteredAssignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(filteredAssignments.map(a => a.username));
    }
  };

  // Handle select one
  const handleSelectOne = (username: string) => {
    if (selectedAssignments.includes(username)) {
      setSelectedAssignments(selectedAssignments.filter(u => u !== username));
    } else {
      setSelectedAssignments([...selectedAssignments, username]);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    selectedAssignments.forEach(username => {
      onDelete(username);
    });
    setSelectedAssignments([]);
    setShowDeleteDialog(false);
  };

  // Handle bulk test
  const handleBulkTest = () => {
    const selectedItems = assignments.filter(a => selectedAssignments.includes(a.username));
    selectedItems.forEach(assignment => {
      onTest(assignment);
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Voice Assignments
            </CardTitle>
            <CardDescription>
              Customize voices for specific users in your chat
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {assignments.length} {assignments.length === 1 ? "user" : "users"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users or voices..."
              className="pl-8 w-[240px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedAssignments.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkTest}
                className="h-8"
              >
                <Volume2 className="h-3.5 w-3.5 mr-1" />
                Test {selectedAssignments.length} {selectedAssignments.length === 1 ? "Voice" : "Voices"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete {selectedAssignments.length}
              </Button>
            </div>
          )}
        </div>

        {assignments.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedAssignments.length === filteredAssignments.length && filteredAssignments.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("username")}>
                      <div className="flex items-center gap-1">
                        Username
                        {sortBy === "username" && (
                          <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("voiceName")}>
                      <div className="flex items-center gap-1">
                        Voice
                        {sortBy === "voiceName" && (
                          <ChevronDown className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAssignments.length > 0 ? (
                    sortedAssignments.map((assignment, index) => {
                      const originalIndex = assignments.findIndex(a => a.username === assignment.username);
                      return (
                        <TableRow key={assignment.username} className="group hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={selectedAssignments.includes(assignment.username)}
                              onCheckedChange={() => handleSelectOne(assignment.username)}
                              aria-label={`Select ${assignment.username}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{assignment.username}</TableCell>
                          <TableCell>{assignment.voiceName}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Badge variant="outline" title="Rate">
                                {assignment.rate?.toFixed(1) || "1.0"}x
                              </Badge>
                              <Badge variant="outline" title="Pitch">
                                {assignment.pitch?.toFixed(1) || "1.0"}
                              </Badge>
                              <Badge variant="outline" title="Volume">
                                {(assignment.volume! * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onTest(assignment)}
                                title="Test Voice"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(originalIndex)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(assignment.username)}
                                className="text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                          <p className="text-sm font-medium mb-1">No results found</p>
                          <p className="text-xs text-muted-foreground">
                            Try a different search term or clear your filters
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md bg-muted/10">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">No voice assignments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first voice assignment using the form above.
            </p>
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog for Bulk Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voice Assignments</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAssignments.length} voice {selectedAssignments.length === 1 ? "assignment" : "assignments"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserVoiceTable;
