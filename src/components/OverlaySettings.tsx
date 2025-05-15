import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ObsOverlaySettings from "./ObsOverlaySettings";
import MultiZoneOverlay from "./MultiZoneOverlay";
import TabContainer from "./layout/TabContainer";
import Section from "./layout/Section";

const OverlaySettings = () => {
  // Define the overlay tabs
  const overlayTabs = [
    {
      value: "single",
      label: "Single Zone Overlay",
      content: <ObsOverlaySettings />
    },
    {
      value: "multi",
      label: "Multi-Zone Overlay",
      content: <MultiZoneOverlay />
    }
  ];

  return (
    <Section title="OBS Overlay Settings" description="Configure how your TTS messages appear on stream">
      <TabContainer tabs={overlayTabs} defaultValue="single" />
    </Section>
  );
};

export default OverlaySettings;
