import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SpeechQueueItem } from "@/services/speech/types";
import speechService from "@/services/SpeechService";

interface Zone {
  id: string;
  name: string;
  type: string;
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

interface ZoneMessage {
  id: string;
  text: string;
  username?: string;
  type: string;
  timestamp: number;
}

const MultiZoneView = () => {
  const [searchParams] = useSearchParams();
  const [zones, setZones] = useState<Zone[]>([]);
  const [messages, setMessages] = useState<Record<string, ZoneMessage[]>>({});
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Load zones from URL parameters
  useEffect(() => {
    const configParam = searchParams.get('config');
    if (configParam) {
      try {
        const parsedZones = JSON.parse(decodeURIComponent(configParam));
        setZones(parsedZones);
        
        // Initialize messages object with empty arrays for each zone
        const initialMessages: Record<string, ZoneMessage[]> = {};
        parsedZones.forEach((zone: Zone) => {
          initialMessages[zone.id] = [];
        });
        setMessages(initialMessages);
      } catch (error) {
        console.error('Error parsing zones configuration:', error);
      }
    }
  }, [searchParams]);

  // Poll the queue status and update messages
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(speechService.isSpeaking());
      
      // Get the current queue
      const queue = speechService.getQueue();
      const currentMessage = speechService.getCurrentMessage();
      
      // Process new messages and assign them to zones
      if (currentMessage) {
        processMessage(currentMessage);
      }
      
      // Clean up old messages (older than 30 seconds)
      const now = Date.now();
      const updatedMessages = { ...messages };
      
      Object.keys(updatedMessages).forEach(zoneId => {
        updatedMessages[zoneId] = updatedMessages[zoneId].filter(
          msg => now - msg.timestamp < 30000
        );
      });
      
      setMessages(updatedMessages);
    }, 500);

    return () => clearInterval(interval);
  }, [messages, zones]);

  // Process a message and assign it to appropriate zones
  const processMessage = (item: SpeechQueueItem) => {
    if (!item.text) return;
    
    const newMessage: ZoneMessage = {
      id: item.messageId || Date.now().toString(),
      text: item.text,
      username: item.username,
      type: 'chat', // Default type
      timestamp: Date.now()
    };
    
    // Check each zone to see if this message belongs there
    zones.forEach(zone => {
      if (shouldShowInZone(newMessage, zone)) {
        // Check if message already exists in this zone
        const zoneMessages = messages[zone.id] || [];
        if (!zoneMessages.some(msg => msg.id === newMessage.id)) {
          setMessages(prev => ({
            ...prev,
            [zone.id]: [...(prev[zone.id] || []), newMessage]
          }));
        }
      }
    });
  };

  // Determine if a message should be shown in a zone based on filters
  const shouldShowInZone = (message: ZoneMessage, zone: Zone): boolean => {
    const { filters } = zone;
    
    // Check username filter
    if (filters.usernames.length > 0 && message.username) {
      if (!filters.usernames.some(u => 
        message.username?.toLowerCase() === u.toLowerCase()
      )) {
        return false;
      }
    }
    
    // Check keyword filter
    if (filters.keywords.length > 0) {
      if (!filters.keywords.some(keyword => 
        message.text.toLowerCase().includes(keyword.toLowerCase())
      )) {
        return false;
      }
    }
    
    // Check message type filter
    if (filters.messageTypes.length > 0) {
      if (!filters.messageTypes.includes(message.type)) {
        return false;
      }
    }
    
    return true;
  };

  return (
    <div className="multi-zone-container">
      {zones.map(zone => (
        <div
          key={zone.id}
          className="zone"
          style={{
            position: 'absolute',
            left: `${zone.position.x}px`,
            top: `${zone.position.y}px`,
            width: `${zone.size.width}px`,
            height: `${zone.size.height}px`,
            backgroundColor: zone.style.backgroundColor,
            color: zone.style.textColor,
            fontFamily: zone.style.fontFamily,
            fontSize: `${zone.style.fontSize}px`,
            borderRadius: `${zone.style.borderRadius}px`,
            border: `1px solid ${zone.style.borderColor}`,
            overflow: 'hidden',
            padding: '10px',
            boxSizing: 'border-box'
          }}
        >
          <div className="zone-name" style={{ opacity: 0.7, marginBottom: '5px', fontSize: '0.8em' }}>
            {zone.name}
          </div>
          
          <div className="zone-messages" style={{ overflowY: 'auto', height: 'calc(100% - 25px)' }}>
            {messages[zone.id]?.map((message, index) => (
              <div 
                key={message.id} 
                className="message animate-fade-in"
                style={{ marginBottom: '8px' }}
              >
                {message.username && (
                  <span className="username" style={{ fontWeight: 'bold', marginRight: '5px' }}>
                    {message.username}:
                  </span>
                )}
                <span className="text">{message.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <style jsx>{`
        .multi-zone-container {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MultiZoneView;
