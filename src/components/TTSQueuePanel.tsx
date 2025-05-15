import { useState, useEffect } from "react";
import { Button } from "./ui/button";
// Removed Card imports as we're using custom card designs
import { Volume2, SkipForward, Loader2, X } from "lucide-react";
// Using status bar for notifications instead of toast
import speechService from "@/services/SpeechService";
import { SpeechQueueItem } from "@/services/speech/types";

const TTSQueuePanel = () => {
  const [queue, setQueue] = useState<SpeechQueueItem[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<SpeechQueueItem | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<{[key: string]: boolean}>({});

  // Function to show notifications in the status bar instead of toast
  const showStatusNotification = (type: 'info' | 'success' | 'error', message: string) => {
    // Dispatch a custom event that the StatusBar component will listen for
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: { type, message }
    }));
  };
  // Removed expanded state since we now use tabs

  // Poll the queue status every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const currentQueue = speechService.getQueue();
      setQueue(currentQueue);
      setIsSpeaking(speechService.isSpeaking());

      // Get the current message being spoken
      const current = speechService.getCurrentMessage();
      setCurrentMessage(current);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Skip the current message
  const handleSkipCurrent = () => {
    speechService.skipCurrent();
    showStatusNotification('info', "Skipped current message");
  };

  // Skip a specific message in the queue
  const handleSkipMessage = (messageId: string) => {
    if (messageId && speechService.skipMessage(messageId)) {
      setQueue(speechService.getQueue()); // Update immediately
      showStatusNotification('info', "Skipped message");
    }
  };

  // Preload audio for a message
  const handleFetchAudio = async (item: SpeechQueueItem) => {
    if (!item.messageId) return;

    setLoadingAudio(prev => ({ ...prev, [item.messageId!]: true }));

    try {
      await speechService.preloadAudio(item.text, item.messageId);
      showStatusNotification('success', "Audio prepared");
    } catch (error) {
      showStatusNotification('error', "Failed to prepare audio");
    } finally {
      setLoadingAudio(prev => ({ ...prev, [item.messageId!]: false }));
    }
  };

  // Remove a message from the queue
  const handleRemoveMessage = (messageId: string) => {
    if (messageId && speechService.removeFromQueue(messageId)) {
      setQueue(speechService.getQueue()); // Update immediately
      showStatusNotification('info', "Removed message from queue");
    }
  };

  if (queue.length === 0 && !isSpeaking) {
    return (
      <div className="w-full h-full flex flex-col p-4">
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-medium">Queue Status</h2>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="text-center p-8 bg-card rounded-xl w-full max-w-md shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-medium mb-3">Queue Empty</h3>
            <p className="text-muted-foreground">
              No messages are currently in the TTS queue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-medium">Queue Status</h2>
      </div>
      <div className="space-y-3 flex-grow overflow-y-auto pr-1">
        {isSpeaking && currentMessage && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl shadow-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <Volume2 className="h-4 w-4 animate-pulse text-primary" />
              </div>
              <div className="text-sm font-medium">Now Speaking</div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipCurrent}
                  className="rounded-full h-8 px-3"
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
            <div className="bg-card/70 p-4 rounded-xl shadow-sm">
              <div className="flex items-center mb-2">
                <div className="text-sm font-semibold text-primary">
                  {currentMessage.username ? `${currentMessage.username}` : 'System Message'}
                </div>
              </div>
              <div className="text-sm">
                {/* Extract the actual message content */}
                {(() => {
                  // If the message contains "says:" (formatted by TTS), extract the actual message
                  if (currentMessage.text.includes(' says: ')) {
                    return currentMessage.text.split(' says: ')[1];
                  }
                  // Otherwise just return the text
                  return currentMessage.text;
                })()}
              </div>
            </div>
          </div>
        )}

        {queue.map((item, index) => (
          <div key={item.messageId || index} className="bg-card rounded-xl shadow-lg p-4">
            <div className="flex items-center mb-2">
              <div className="flex-1">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted/40 text-xs font-medium">
                  {item.username ? `${item.username}` : 'System Message'}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-7 px-2.5"
                  onClick={() => handleFetchAudio(item)}
                  disabled={loadingAudio[item.messageId!]}
                >
                  {loadingAudio[item.messageId!] ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Prep
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 mr-1" />
                      Prep
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-7 px-2.5"
                  onClick={() => item.messageId && handleSkipMessage(item.messageId)}
                >
                  <SkipForward className="h-3.5 w-3.5 mr-1" />
                  Skip
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-7 px-2.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={() => item.messageId && handleRemoveMessage(item.messageId)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
            <div className="text-sm mt-2 pl-1">
              {/* Extract the actual message content */}
              {(() => {
                // If the message contains "says:" (formatted by TTS), extract the actual message
                if (item.text.includes(' says: ')) {
                  return item.text.split(' says: ')[1];
                }
                // Otherwise just return the text
                return item.text;
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TTSQueuePanel;
