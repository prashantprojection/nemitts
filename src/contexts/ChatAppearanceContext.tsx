import React, { createContext, useContext, useState, useEffect } from 'react';

export type MessageAlignment = 'left' | 'right' | 'by-role';
export type ChatStyle = 'whatsapp' | 'twitch' | 'discord' | 'telegram' | 'classic' | 'compact';

interface ChatAppearanceContextType {
  messageAlignment: MessageAlignment;
  setMessageAlignment: (alignment: MessageAlignment) => void;
  chatStyle: ChatStyle;
  setChatStyle: (style: ChatStyle) => void;
  showTimestamps: boolean;
  setShowTimestamps: (show: boolean) => void;
  saveSettings: () => void;
}

const ChatAppearanceContext = createContext<ChatAppearanceContextType | undefined>(undefined);

export function ChatAppearanceProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage or defaults
  const [messageAlignment, setMessageAlignment] = useState<MessageAlignment>(() => {
    const saved = localStorage.getItem('chat-message-alignment');
    return (saved as MessageAlignment) || 'by-role';
  });

  const [chatStyle, setChatStyle] = useState<ChatStyle>(() => {
    const saved = localStorage.getItem('chat-style');
    return (saved as ChatStyle) || 'modern';
  });

  const [showTimestamps, setShowTimestamps] = useState<boolean>(() => {
    const saved = localStorage.getItem('chat-show-timestamps');
    return saved ? saved === 'true' : true;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chat-message-alignment', messageAlignment);
    localStorage.setItem('chat-style', chatStyle);
    localStorage.setItem('chat-show-timestamps', showTimestamps.toString());
  }, [messageAlignment, chatStyle, showTimestamps]);

  // Function to save settings (can be extended to save to backend)
  const saveSettings = () => {
    localStorage.setItem('chat-message-alignment', messageAlignment);
    localStorage.setItem('chat-style', chatStyle);
    localStorage.setItem('chat-show-timestamps', showTimestamps.toString());
    console.log('Chat appearance settings saved');
  };

  return (
    <ChatAppearanceContext.Provider
      value={{
        messageAlignment,
        setMessageAlignment,
        chatStyle,
        setChatStyle,
        showTimestamps,
        setShowTimestamps,
        saveSettings,
      }}
    >
      {children}
    </ChatAppearanceContext.Provider>
  );
}

export function useChatAppearance() {
  const context = useContext(ChatAppearanceContext);

  if (context === undefined) {
    throw new Error('useChatAppearance must be used within a ChatAppearanceProvider');
  }

  return context;
}
