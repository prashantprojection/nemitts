import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SpeechQueueItem } from "@/services/speech/types";
import speechService from "@/services/SpeechService";
// Bubble types import removed
import settingsService from "@/services/SettingsService";

// Default theme settings
const defaultTheme = {
  enabled: true,
  width: 800,
  height: 200,
  fontSize: 16,
  fontFamily: "Inter, sans-serif",
  textColor: "#ffffff",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  accentColor: "#9146FF",
  borderRadius: 8,
  showQueue: true,
  maxQueueItems: 3,
  showSpeakingIndicator: true,
  animation: "fade",
  customCSS: ""
};

const ObsView = () => {
  const [searchParams] = useSearchParams();
  const [queue, setQueue] = useState<SpeechQueueItem[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [theme, setTheme] = useState(defaultTheme);
  // Bubble style state removed

  // Load theme from URL parameters
  useEffect(() => {
    const themeParam = searchParams.get('theme');
    if (themeParam) {
      try {
        // First try to decode the theme parameter
        const decodedTheme = decodeURIComponent(themeParam);
        console.log('Decoded theme parameter:', decodedTheme);

        // Then parse it as JSON
        const parsedTheme = JSON.parse(decodedTheme);
        console.log('Parsed theme:', parsedTheme);

        // Apply the theme settings
        setTheme({ ...defaultTheme, ...parsedTheme });
      } catch (error) {
        console.error('Error parsing theme parameter:', error);
      }
    } else {
      console.warn('No theme parameter found in URL');
    }
  }, [searchParams]);

  // Bubble settings loading removed

  // Poll the queue status every 500ms
  useEffect(() => {
    // Initial load
    setQueue(speechService.getQueue());
    setIsSpeaking(speechService.isSpeaking());

    const interval = setInterval(() => {
      setQueue(speechService.getQueue());
      setIsSpeaking(speechService.isSpeaking());

      // Get the first item in the queue as the current message
      const queueItems = speechService.getQueue();
      if (queueItems.length > 0) {
        const firstItem = queueItems[0];
        setCurrentMessage(firstItem.text || "");
        setCurrentUser(firstItem.username || "");
      } else if (!speechService.isSpeaking()) {
        setCurrentMessage("");
        setCurrentUser("");
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // If nothing is happening, return an empty div
  if (!isSpeaking && queue.length === 0 && !currentMessage) {
    return <div className="obs-container"></div>;
  }

  // Determine animation class based on theme
  const getAnimationClass = () => {
    switch (theme.animation) {
      case 'fade':
        return 'animate-fade-in';
      case 'slide':
        return 'animate-slide-in';
      case 'bounce':
        return 'animate-bounce-in';
      default:
        return '';
    }
  };

  return (
    <div
      className="obs-container"
      style={{
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        fontSize: `${theme.fontSize}px`,
        padding: '16px',
        width: '100%',
        height: '100%'
      }}
    >
      {currentMessage && (
        <div
          className={`current-message-container ${getAnimationClass()}`}
          style={{
            ...{
              padding: '10px',
              borderRadius: `${theme.borderRadius}px`,
              backgroundColor: theme.backgroundColor,
              backdropFilter: 'blur(10px)',
              borderLeft: `4px solid ${theme.accentColor}`
            }
          }}
        >
          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="username font-bold">
                {currentUser}:
              </div>
            )}
            <div className="message">
              {currentMessage}
            </div>
          </div>

          {/* Animated speaking indicator */}
          {isSpeaking && theme.showSpeakingIndicator && (
            <div className="speaking-indicator flex gap-1 mt-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: theme.accentColor }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-pulse delay-100"
                style={{ backgroundColor: theme.accentColor }}
              ></div>
              <div
                className="w-2 h-2 rounded-full animate-pulse delay-200"
                style={{ backgroundColor: theme.accentColor }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Queue display (only show if there are items and showQueue is enabled) */}
      {queue.length > 0 && theme.showQueue && (
        <div
          className="queue-container mt-4"
          style={{
            ...{
              padding: '8px',
              borderRadius: `${theme.borderRadius}px`,
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }
          }}
        >
          <div className="text-sm mb-1" style={{ opacity: 0.8 }}>Up next:</div>
          <div className="queue-items space-y-1">
            {queue.slice(0, theme.maxQueueItems).map((item, index) => (
              <div key={index} className="queue-item text-sm" style={{ opacity: 0.7 }}>
                {item.username ? `${item.username}: ` : ""}
                {item.text}
              </div>
            ))}
            {queue.length > theme.maxQueueItems && (
              <div className="text-xs" style={{ opacity: 0.5 }}>
                +{queue.length - theme.maxQueueItems} more messages
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .obs-container {
          min-height: 100px;
          transition: all 0.3s ease;
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }

        .animate-slide-in {
          animation: slideIn 0.5s ease-in-out;
        }

        .animate-bounce-in {
          animation: bounceIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }

        ${theme.customCSS}
      `}</style>
    </div>
  );
};

export default ObsView;

