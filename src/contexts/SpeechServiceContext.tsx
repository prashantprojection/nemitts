import React, { createContext, useContext } from 'react';
import speechService from '@/services/SpeechService';

const SpeechServiceContext = createContext(speechService);

export const useSpeechService = () => {
  const context = useContext(SpeechServiceContext);
  if (!context) {
    throw new Error('useSpeechService must be used within a SpeechServiceProvider');
  }
  return context;
};

export const SpeechServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SpeechServiceContext.Provider value={speechService}>
      {children}
    </SpeechServiceContext.Provider>
  );
};

export default SpeechServiceContext; 