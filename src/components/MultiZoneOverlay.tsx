import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, ExternalLink, Save, Plus, Trash2, Move } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Zone types
type ZoneType = "chat" | "alerts" | "custom";

interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  filters: {
    usernames: string[];
    keywords: string[];
    messageTypes: string[];
  };
  style: {
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
    borderRadius: number;
    borderColor: string;
  };
}

// Default zone settings
const defaultZone: Zone = {
  id: "",
  name: "",
  type: "chat",
  position: {
    x: 0,
    y: 0
  },
  size: {
    width: 300,
    height: 200
  },
  filters: {
    usernames: [],
    keywords: [],
    messageTypes: []
  },
  style: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    textColor: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter, sans-serif",
    borderRadius: 8,
    borderColor: "#9146FF"
  }
};

const MultiZoneOverlay = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentZone, setCurrentZone] = useState<Zone>({ ...defaultZone });
  const [activeTab, setActiveTab] = useState<string>("zones");

  // Load zones from localStorage
  useEffect(() => {
    try {
      const savedZones = localStorage.getItem('multi-zone-overlay');
      if (savedZones) {
        const parsedZones = JSON.parse(savedZones);
        setZones(parsedZones);
        
        if (parsedZones.length > 0) {
          setSelectedZoneId(parsedZones[0].id);
          setCurrentZone(parsedZones[0]);
        }
      }
    } catch (error) {
      console.error("Error loading zones:", error);
    }
  }, []);

  // Save zones to localStorage
  const saveZones = (updatedZones: Zone[]) => {
    try {
      localStorage.setItem('multi-zone-overlay', JSON.stringify(updatedZones));
      setZones(updatedZones);
      toast.success("Zones saved successfully");
    } catch (error) {
      console.error("Error saving zones:", error);
      toast.error("Failed to save zones");
    }
  };

  // Add a new zone
  const addZone = () => {
    const newZone: Zone = {
      ...defaultZone,
      id: Date.now().toString(),
      name: `Zone ${zones.length + 1}`
    };
    
    const updatedZones = [...zones, newZone];
    saveZones(updatedZones);
    setSelectedZoneId(newZone.id);
    setCurrentZone(newZone);
    setIsEditing(true);
  };

  // Delete a zone
  const deleteZone = (id: string) => {
    const updatedZones = zones.filter(zone => zone.id !== id);
    saveZones(updatedZones);
    
    if (updatedZones.length > 0) {
      setSelectedZoneId(updatedZones[0].id);
      setCurrentZone(updatedZones[0]);
    } else {
      setSelectedZoneId(null);
      setCurrentZone({ ...defaultZone });
    }
  };

  // Update a zone
  const updateZone = () => {
    if (!selectedZoneId) return;
    
    const updatedZones = zones.map(zone => 
      zone.id === selectedZoneId ? currentZone : zone
    );
    
    saveZones(updatedZones);
    setIsEditing(false);
  };

  // Select a zone for editing
  const selectZone = (id: string) => {
    const zone = zones.find(z => z.id === id);
    if (zone) {
      setSelectedZoneId(id);
      setCurrentZone(zone);
      setIsEditing(true);
    }
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(zones);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setZones(items);
    saveZones(items);
  };

  // Generate URL for OBS Browser Source
  const baseUrl = window.location.origin;
  const obsUrl = `${baseUrl}/multi-zone?config=${encodeURIComponent(JSON.stringify(zones))}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('URL copied to clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };

  const openPreview = () => {
    window.open(obsUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Multi-Zone Overlay</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={addZone}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
          
          <Button onClick={() => saveZones(zones)}>
            <Save className="h-4 w-4 mr-2" />
            Save All Zones
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Browser Source URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={obsUrl}
              readOnly
            />
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(obsUrl)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <Button 
            onClick={openPreview}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview Multi-Zone Overlay
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zones</CardTitle>
            </CardHeader>
            <CardContent>
              {zones.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="zones">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {zones.map((zone, index) => (
                          <Draggable key={zone.id} draggableId={zone.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3 rounded-md border flex justify-between items-center ${
                                  selectedZoneId === zone.id ? 'bg-muted border-primary' : ''
                                }`}
                              >
                                <div 
                                  className="flex-1 cursor-pointer" 
                                  onClick={() => selectZone(zone.id)}
                                >
                                  <div className="font-medium">{zone.name}</div>
                                  <div className="text-xs text-muted-foreground">{zone.type}</div>
                                </div>
                                <div className="flex gap-1">
                                  <div {...provided.dragHandleProps} className="cursor-move p-1">
                                    <Move className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteZone(zone.id)}
                                    className="h-8 w-8 text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  No zones created yet. Click "Add Zone" to create your first zone.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          {selectedZoneId && isEditing ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Edit Zone</CardTitle>
                <Button onClick={updateZone}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Zone
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                    <TabsTrigger value="style">Style</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="zone-name">Zone Name</Label>
                      <Input
                        id="zone-name"
                        value={currentZone.name}
                        onChange={(e) => setCurrentZone({ ...currentZone, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="zone-type">Zone Type</Label>
                      <Select
                        value={currentZone.type}
                        onValueChange={(value: ZoneType) => setCurrentZone({ ...currentZone, type: value })}
                      >
                        <SelectTrigger id="zone-type">
                          <SelectValue placeholder="Select zone type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">Chat Messages</SelectItem>
                          <SelectItem value="alerts">Alerts & Notifications</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="position-x" className="text-xs">X</Label>
                            <Input
                              id="position-x"
                              type="number"
                              value={currentZone.position.x}
                              onChange={(e) => setCurrentZone({
                                ...currentZone,
                                position: {
                                  ...currentZone.position,
                                  x: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="position-y" className="text-xs">Y</Label>
                            <Input
                              id="position-y"
                              type="number"
                              value={currentZone.position.y}
                              onChange={(e) => setCurrentZone({
                                ...currentZone,
                                position: {
                                  ...currentZone.position,
                                  y: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="size-width" className="text-xs">Width</Label>
                            <Input
                              id="size-width"
                              type="number"
                              value={currentZone.size.width}
                              onChange={(e) => setCurrentZone({
                                ...currentZone,
                                size: {
                                  ...currentZone.size,
                                  width: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="size-height" className="text-xs">Height</Label>
                            <Input
                              id="size-height"
                              type="number"
                              value={currentZone.size.height}
                              onChange={(e) => setCurrentZone({
                                ...currentZone,
                                size: {
                                  ...currentZone.size,
                                  height: parseInt(e.target.value) || 0
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="filters" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="filter-usernames">Usernames (comma separated)</Label>
                      <Input
                        id="filter-usernames"
                        value={currentZone.filters.usernames.join(', ')}
                        onChange={(e) => setCurrentZone({
                          ...currentZone,
                          filters: {
                            ...currentZone.filters,
                            usernames: e.target.value.split(',').map(u => u.trim()).filter(Boolean)
                          }
                        })}
                        placeholder="user1, user2, user3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Only messages from these users will appear in this zone. Leave empty to include all users.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="filter-keywords">Keywords (comma separated)</Label>
                      <Input
                        id="filter-keywords"
                        value={currentZone.filters.keywords.join(', ')}
                        onChange={(e) => setCurrentZone({
                          ...currentZone,
                          filters: {
                            ...currentZone.filters,
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                          }
                        })}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Only messages containing these keywords will appear in this zone. Leave empty to include all messages.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Message Types</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['chat', 'subscription', 'follow', 'donation', 'raid'].map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Switch
                              id={`type-${type}`}
                              checked={currentZone.filters.messageTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                const types = checked
                                  ? [...currentZone.filters.messageTypes, type]
                                  : currentZone.filters.messageTypes.filter(t => t !== type);
                                
                                setCurrentZone({
                                  ...currentZone,
                                  filters: {
                                    ...currentZone.filters,
                                    messageTypes: types
                                  }
                                });
                              }}
                            />
                            <Label htmlFor={`type-${type}`} className="capitalize">{type}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="style" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="style-bg">Background Color</Label>
                        <Input
                          id="style-bg"
                          type="color"
                          value={currentZone.style.backgroundColor.startsWith('rgba') 
                            ? '#000000' 
                            : currentZone.style.backgroundColor}
                          onChange={(e) => setCurrentZone({
                            ...currentZone,
                            style: {
                              ...currentZone.style,
                              backgroundColor: e.target.value
                            }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="style-text">Text Color</Label>
                        <Input
                          id="style-text"
                          type="color"
                          value={currentZone.style.textColor}
                          onChange={(e) => setCurrentZone({
                            ...currentZone,
                            style: {
                              ...currentZone.style,
                              textColor: e.target.value
                            }
                          })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="style-font-size">Font Size (px)</Label>
                      <Input
                        id="style-font-size"
                        type="number"
                        value={currentZone.style.fontSize}
                        onChange={(e) => setCurrentZone({
                          ...currentZone,
                          style: {
                            ...currentZone.style,
                            fontSize: parseInt(e.target.value) || 16
                          }
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="style-font-family">Font Family</Label>
                      <Select
                        value={currentZone.style.fontFamily}
                        onValueChange={(value) => setCurrentZone({
                          ...currentZone,
                          style: {
                            ...currentZone.style,
                            fontFamily: value
                          }
                        })}
                      >
                        <SelectTrigger id="style-font-family">
                          <SelectValue placeholder="Select font family" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                          <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                          <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                          <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                          <SelectItem value="'Comic Sans MS', cursive">Comic Sans MS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="style-border-radius">Border Radius (px)</Label>
                        <Input
                          id="style-border-radius"
                          type="number"
                          value={currentZone.style.borderRadius}
                          onChange={(e) => setCurrentZone({
                            ...currentZone,
                            style: {
                              ...currentZone.style,
                              borderRadius: parseInt(e.target.value) || 0
                            }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="style-border-color">Border Color</Label>
                        <Input
                          id="style-border-color"
                          type="color"
                          value={currentZone.style.borderColor}
                          onChange={(e) => setCurrentZone({
                            ...currentZone,
                            style: {
                              ...currentZone.style,
                              borderColor: e.target.value
                            }
                          })}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full border rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Zone Editor</h3>
                <p className="text-muted-foreground mb-4">
                  Select a zone to edit or create a new one.
                </p>
                <Button onClick={addZone}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiZoneOverlay;
