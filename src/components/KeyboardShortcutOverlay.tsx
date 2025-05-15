import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Keyboard, X, Info } from "lucide-react";

interface HotkeyInfo {
  shortcut: string;
  description: string;
  category?: string;
}

interface KeyboardShortcutOverlayProps {
  hotkeys: HotkeyInfo[];
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutOverlay = ({ hotkeys, isOpen, onClose }: KeyboardShortcutOverlayProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Group hotkeys by category and remove duplicates
  const uniqueCategories = new Set(hotkeys.map(h => h.category || "general"));
  const categories = ["all", ...Array.from(uniqueCategories)];

  // Remove duplicate shortcuts (same shortcut and description)
  const uniqueHotkeys = hotkeys.reduce((acc, hotkey) => {
    const key = `${hotkey.shortcut}-${hotkey.description}`;
    if (!acc.some(h => `${h.shortcut}-${h.description}` === key)) {
      acc.push(hotkey);
    }
    return acc;
  }, [] as HotkeyInfo[]);

  // Filter hotkeys based on search and category
  const filteredHotkeys = uniqueHotkeys.filter(hotkey => {
    const matchesSearch =
      hotkey.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotkey.shortcut.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "all" ||
      (hotkey.category || "general") === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }

      // Show overlay when user presses "?" with shift
      if (e.key === "?" && e.shiftKey && !isOpen) {
        e.preventDefault();
        // This would normally open the overlay, but we'll leave this to the parent component
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Format category name for display
  const formatCategoryName = (category: string) => {
    if (category === "all") return "All Shortcuts";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Show a visual indicator when a shortcut is used
  const showShortcutFeedback = (shortcut: string, description: string) => {
    // This function can be used to show feedback when shortcuts are used
    console.log(`Shortcut used: ${shortcut} - ${description}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] keyboard-shortcut-dialog">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="w-full" orientation="horizontal">
            <TabsList className="flex w-full h-10 overflow-x-auto">
              {categories.map(category => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="flex-shrink-0"
                >
                  {formatCategoryName(category)}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-4 overflow-hidden">
              <ScrollArea className="keyboard-shortcut-content pr-4">
                {filteredHotkeys.length > 0 ? (
                  <div className="space-y-3">
                    {filteredHotkeys.map((hotkey, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 rounded-lg border hover:bg-accent/10 transition-colors"
                      >
                        <div>
                          <div className="font-medium">{hotkey.description}</div>
                          {hotkey.category && activeCategory === "all" && (
                            <Badge variant="outline" className="mt-1">
                              {formatCategoryName(hotkey.category)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {hotkey.shortcut.split("+").map((key, i) => (
                            <kbd
                              key={i}
                              className="px-2 py-1 text-xs font-semibold bg-muted border rounded-md shadow-sm"
                            >
                              {key.trim()}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <Info className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">No shortcuts found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term or category
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex-shrink-0">
          <p>Press <kbd className="px-1 py-0.5 bg-muted border rounded-md">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted border rounded-md">?</kbd> at any time to show this overlay</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutOverlay;
