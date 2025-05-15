
import { Button } from "@/components/ui/button";
import { Save, Volume2, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface VoiceControlsProps {
  onTestVoice: () => void;
  onSaveSettings: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
  showSavedToast?: boolean;
}

const VoiceControls = ({
  onTestVoice,
  onSaveSettings,
  isSaving = false,
  hasChanges = true,
  showSavedToast = false
}: VoiceControlsProps) => {
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success indicator when settings are saved
  useEffect(() => {
    if (showSavedToast) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSavedToast]);

  // Add a subtle animation to the save button when settings are saved
  const saveButtonClasses = `
    flex-1 h-12 transition-all duration-300
    ${showSuccess
      ? 'bg-primary hover:bg-primary/90 shadow-md'
      : 'bg-primary hover:bg-primary/90'}
    ${!hasChanges && !showSuccess ? 'opacity-70' : 'opacity-100'}
    text-primary-foreground
  `;

  // Disable the button when there are no changes or when saving
  const isButtonDisabled = isSaving || (!hasChanges && !showSuccess);

  return (
    <div className="flex gap-4 mt-8 border-t pt-6 max-w-4xl mx-auto">
      <Button
        onClick={onTestVoice}
        variant="outline"
        className="flex-1 h-12"
      >
        <Volume2 className="mr-2 h-4 w-4" />
        Test Voice
      </Button>

      <Button
        onClick={onSaveSettings}
        className={saveButtonClasses}
        disabled={isButtonDisabled}
      >
        {isSaving ? (
          <>
            <span className="animate-pulse mr-2">Saving...</span>
          </>
        ) : showSuccess ? (
          <>
            <Check className="mr-2 h-4 w-4 animate-bounce" />
            <span className="font-medium">General Voice Saved!</span>
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save General Voice
          </>
        )}
      </Button>
    </div>
  );
};

export default VoiceControls;
