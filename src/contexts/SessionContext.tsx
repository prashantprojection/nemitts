import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { TwitchMessage } from '@/services/TwitchService';

interface SessionContextType {
  messages: TwitchMessage[];
  setMessages: (messages: TwitchMessage[]) => void;
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
  channelName: string;
  setChannelName: (channelName: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  debugMode: boolean;
  setDebugMode: (debugMode: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from sessionStorage if available
  const [messages, setMessages] = useState<TwitchMessage[]>(() => {
    const savedMessages = sessionStorage.getItem('twitch-tts-messages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });

  const [isConnected, setIsConnected] = useState<boolean>(() => {
    const savedIsConnected = sessionStorage.getItem('twitch-tts-isConnected');
    return savedIsConnected ? JSON.parse(savedIsConnected) : false;
  });

  const [channelName, setChannelName] = useState<string>(() => {
    return sessionStorage.getItem('twitch-tts-channelName') || '';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedIsLoggedIn = sessionStorage.getItem('twitch-tts-isLoggedIn');
    return savedIsLoggedIn ? JSON.parse(savedIsLoggedIn) : false;
  });

  const [debugMode, setDebugMode] = useState<boolean>(() => {
    const savedDebugMode = sessionStorage.getItem('twitch-tts-debugMode');
    return savedDebugMode ? JSON.parse(savedDebugMode) : false;
  });

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('twitch-tts-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem('twitch-tts-isConnected', JSON.stringify(isConnected));
  }, [isConnected]);

  useEffect(() => {
    sessionStorage.setItem('twitch-tts-channelName', channelName);
  }, [channelName]);

  useEffect(() => {
    sessionStorage.setItem('twitch-tts-isLoggedIn', JSON.stringify(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    sessionStorage.setItem('twitch-tts-debugMode', JSON.stringify(debugMode));
  }, [debugMode]);

  return (
    <SessionContext.Provider
      value={{
        messages,
        setMessages,
        isConnected,
        setIsConnected,
        channelName,
        setChannelName,
        isLoggedIn,
        setIsLoggedIn,
        debugMode,
        setDebugMode
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
