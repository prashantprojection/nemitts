import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeechQueueItem } from "@/services/speech/types";
import speechService from "@/services/SpeechService";
import { SkipForward, X, ArrowUp, ArrowDown, Volume2, Loader2 } from "lucide-react";
// Toast functionality removed
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const QueueDisplay = () => {
  const [queue, setQueue] = useState<SpeechQueueItem[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<SpeechQueueItem | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<{[key: string]: boolean}>({});

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

  // Function to show notifications in the status bar instead of toast
  const showStatusNotification = (type: 'info' | 'success' | 'error', message: string) => {
    // Dispatch a custom event that the StatusBar component will listen for
    window.dispatchEvent(new CustomEvent('status-notification', {
      detail: { type, message }
    }));
  };

  const handleSkipCurrent = () => {
    speechService.skipCurrent();
    showStatusNotification('info', "Skipped current message");
  };

  const handleRemoveFromQueue = (messageId: string) => {
    if (messageId && speechService.removeFromQueue(messageId)) {
      setQueue(speechService.getQueue()); // Update immediately
      showStatusNotification('info', "Removed message from queue");
    }
  };

  const handleMoveUp = (messageId: string, currentIndex: number) => {
    if (currentIndex > 0 && messageId) {
      if (speechService.reorderQueue(messageId, currentIndex - 1)) {
        setQueue(speechService.getQueue()); // Update immediately
      }
    }
  };

  const handleMoveDown = (messageId: string, currentIndex: number) => {
    if (currentIndex < queue.length - 1 && messageId) {
      if (speechService.reorderQueue(messageId, currentIndex + 1)) {
        setQueue(speechService.getQueue()); // Update immediately
      }
    }
  };

  // Fetch audio for a message
  const handleFetchAudio = async (item: SpeechQueueItem) => {
    if (!item.messageId) return;

    // Set loading state for this message
    setLoadingAudio(prev => ({ ...prev, [item.messageId!]: true }));

    try {
      // Get the formatted text for TTS
      const text = item.text;

      // Fetch the audio (this would normally be an API call)
      await speechService.preloadAudio(text, item.messageId);

      showStatusNotification('success', "Audio fetched and ready");
    } catch (error) {
      console.error("Error fetching audio:", error);
      showStatusNotification('error', "Failed to fetch audio");
    } finally {
      // Clear loading state
      setLoadingAudio(prev => ({ ...prev, [item.messageId!]: false }));
    }
  };

  // Skip a specific message in the queue
  const handleSkipMessage = (messageId: string) => {
    if (messageId && speechService.skipMessage(messageId)) {
      setQueue(speechService.getQueue()); // Update immediately
      showStatusNotification('info', "Skipped message");
    }
  };

  if (queue.length === 0 && !isSpeaking) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4 text-muted-foreground">
          No messages in queue
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">TTS Message Queue</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              speechService.clearQueue();
              showStatusNotification('info', "Queue cleared");
            }}
          >
            Clear Queue
          </Button>
        </div>
        {isSpeaking && currentMessage && (
          <Card className="p-3 bg-primary/10 border-primary">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 animate-pulse text-primary" />
                  <div className="text-sm font-medium">Currently Speaking</div>
                </div>
                <div className="mt-1">
                  <div className="text-sm font-medium">
                    {currentMessage.username ? `${currentMessage.username}` : 'System Message'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentMessage.text}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipCurrent}
                className="flex items-center gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </div>
          </Card>
        )}

        {queue.map((item, index) => (
          <Card key={item.messageId || index} className="p-3 flex justify-between items-center">
            <div className="flex-1 truncate">
              <div className="text-sm font-medium">
                {item.username ? `${item.username}` : 'System Message'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {item.text}
              </div>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleFetchAudio(item)}
                    disabled={loadingAudio[item.messageId!]}
                  >
                    {loadingAudio[item.messageId!] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fetch audio for this message</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSkipMessage(item.messageId!)}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Skip this message</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMoveUp(item.messageId!, index)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move up in queue</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMoveDown(item.messageId!, index)}
                    disabled={index === queue.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move down in queue</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveFromQueue(item.messageId!)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove from queue</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default QueueDisplay;
