import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, Plus, UserMinus, Hash, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface BlocklistTableProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void | Promise<void>;
  type: "users" | "words";
  placeholder: string;
}

const BlocklistTable = ({
  items,
  onAdd,
  onRemove,
  type,
  placeholder
}: BlocklistTableProps) => {
  const [newItem, setNewItem] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Create a copy of the filtered items to avoid reference issues
      setSelectedItems([...filteredItems]);
    } else {
      setSelectedItems([]);
    }
  };

  // Handle select one
  const handleSelectOne = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    // Create a copy of the selected items before we start removing them
    const itemsToRemove = [...selectedItems];

    console.log(`Bulk deleting ${itemsToRemove.length} items:`, itemsToRemove);

    // Clear the selection immediately for better UX
    setSelectedItems([]);
    setIsDeleting(true);

    try {
      // Process all items at once if possible
      if (typeof onRemove === 'function') {
        // Create an array of promises for all items
        const deletePromises = itemsToRemove.map(item => {
          try {
            const result = onRemove(item);
            return result instanceof Promise ? result : Promise.resolve();
          } catch (error) {
            console.error(`Error removing item ${item}:`, error);
            return Promise.resolve(); // Continue with other deletions
          }
        });

        // Wait for all deletions to complete
        await Promise.all(deletePromises);
      }

      console.log('Bulk deletion completed');
    } catch (error) {
      console.error('Error during bulk deletion:', error);
    } finally {
      // Ensure we always clear the deleting state
      setTimeout(() => {
        setIsDeleting(false);
      }, 500);
    }
  };

  // Handle add item
  const handleAddItem = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim().toLowerCase());
      setNewItem("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new item section - highlighted */}
      <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
        <div className="space-y-2">
          <label className="text-base font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add {type === "users" ? "User" : "Word"} to Blocklist
          </label>
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newItem.trim()) {
                  handleAddItem();
                }
              }}
              className="flex-1"
            />
            <Button
              variant="default"
              onClick={handleAddItem}
              disabled={!newItem.trim()}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {type === "users" ?
              "Add usernames to block their messages from being read by TTS" :
              "Add words to block messages containing them from being read"}
          </p>
        </div>
      </div>

      {/* Search section */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${type === "users" ? "users" : "words"}...`}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground ml-4">
          {filteredItems.length} of {items.length} {type === "users" ? "users" : "words"}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 my-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={() => {
              if (selectedItems.length === filteredItems.length && filteredItems.length > 0) {
                setSelectedItems([]);
              } else {
                handleSelectAll(true);
              }
            }}
            disabled={filteredItems.length === 0}
          >
            <Checkbox
              checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
              className="mr-1"
              aria-label="Select all"
            />
            {selectedItems.length === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {selectedItems.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete {selectedItems.length} {selectedItems.length === 1 ?
                  (type === "users" ? "User" : "Word") :
                  (type === "users" ? "Users" : "Words")
                }
              </>
            )}
          </Button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="border rounded-md overflow-hidden shadow-sm">
          <ScrollArea className="h-[300px] w-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px] text-center">
                    #
                  </TableHead>
                  <TableHead className="font-medium">{type === "users" ? "Username" : "Word"}</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow
                      key={item}
                      className={`group hover:bg-muted/30 transition-colors ${selectedItems.includes(item) ? 'bg-primary/5' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item)}
                          onCheckedChange={() => handleSelectOne(item)}
                          aria-label={`Select ${item}`}
                        />
                      </TableCell>
                      <TableCell
                        className="font-medium cursor-pointer"
                        onClick={() => handleSelectOne(item)}
                      >
                        {item}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            try {
                              const result = onRemove(item);
                              if (result instanceof Promise) {
                                await result;
                              }
                            } catch (error) {
                              console.error(`Error removing item ${item}:`, error);
                            }
                          }}
                          className="opacity-70 hover:opacity-100 transition-opacity"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? (
                        <>
                          <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <h3 className="text-base font-medium mb-1">
                            No matches found for "{searchQuery}"
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Try a different search term
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            No {type === "users" ? "users" : "words"} found
                          </p>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/10">
          {type === "users" ? (
            <UserMinus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          ) : (
            <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          )}
          <h3 className="text-lg font-medium mb-1">
            No {type === "users" ? "blocked users" : "blocked words"} yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add {type === "users" ? "users" : "words"} using the form above.
          </p>
        </div>
      )}
    </div>
  );
};

export default BlocklistTable;
