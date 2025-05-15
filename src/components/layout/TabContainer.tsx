import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
  onValueChange?: (value: string) => void;
  value?: string;
}

/**
 * A consistent tab container component
 * Ensures consistent height and prevents layout shifts
 */
const TabContainer = ({
  tabs,
  defaultValue,
  className = "",
  orientation = "horizontal",
  onValueChange,
  value
}: TabContainerProps) => {
  // Use internal state only if no external value/onChange is provided
  const [internalActiveTab, setInternalActiveTab] = React.useState(defaultValue || tabs[0]?.value);

  // Determine if we're using controlled or uncontrolled mode
  const isControlled = value !== undefined && onValueChange !== undefined;
  const activeTab = isControlled ? value : internalActiveTab;

  // Handle tab change
  const handleTabChange = (newValue: string) => {
    if (isControlled) {
      // In controlled mode, call the parent's onValueChange
      onValueChange(newValue);
    } else {
      // In uncontrolled mode, update internal state
      setInternalActiveTab(newValue);
    }
  };

  // Calculate grid columns based on number of tabs
  const gridCols = orientation === "horizontal"
    ? `grid-cols-${Math.min(tabs.length, 6)}`
    : "grid-cols-1";

  // Force horizontal orientation for main tabs
  const effectiveOrientation = orientation;

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={`w-full flex flex-col h-full flex-grow shadow-none ${className}`}
      orientation="horizontal"
    >
      <div className="flex flex-col w-full h-full flex-grow">
        <TabsList className="flex w-full bg-muted/30 p-2 gap-2 rounded-lg h-auto">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 min-w-fit px-4 py-2 rounded-md border border-transparent hover:bg-muted/50 data-[state=active]:bg-background data-[state=active]:border-primary data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="w-full flex flex-col h-full flex-grow">
          {tabs.map(tab => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-4 pt-2 outline-none flex flex-col w-full h-full flex-grow overflow-auto"
            >
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
};

export default TabContainer;
