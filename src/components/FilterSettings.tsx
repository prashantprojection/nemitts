import { useFilterSettingsContext } from "@/hooks/useFilterSettingsContext";
import TabContainer from "./layout/TabContainer";
import FilterSettingsPanel from "./filter-settings/FilterSettings";
import FilterSettingsGrid from "./filter-settings/FilterSettingsGrid";
import BlocklistSettings from "./filter-settings/BlocklistSettings";
import NicknameSettings from "./filter-settings/NicknameSettings";
import WordReplacementSettings from "./filter-settings/WordReplacementSettings";

const FilterSettings = () => {
  const {
    isLoading
  } = useFilterSettingsContext();

  if (isLoading) {
    return <div className="text-center py-6">Loading filter settings...</div>;
  }

  // Define the tabs for the filter settings
  const filterTabs = [
    {
      value: "filters",
      label: "Filters",
      content: <FilterSettingsGrid />
    },
    {
      value: "blocklists",
      label: "Blocklists",
      content: <BlocklistSettings />
    },
    {
      value: "nicknames",
      label: "Nicknames",
      content: <NicknameSettings />
    },
    {
      value: "replacements",
      label: "Word Replacements",
      content: <WordReplacementSettings />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Message Filtering</h2>
      </div>

      <TabContainer tabs={filterTabs} defaultValue="filters" />
    </div>
  );
};

export default FilterSettings;
