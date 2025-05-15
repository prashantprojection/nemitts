import React from 'react';
import { TwitchMessage } from '@/services/TwitchService';
import ChatBubble from './ChatBubble';

interface ChatMessageProps {
  message: TwitchMessage;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const {
    displayName,
    message: text,
    timestamp,
    profileImageUrl,
    isModerator,
    isVip,
    isSubscriber
  } = message;

  // Convert timestamp to Date object
  const date = new Date(timestamp);

  return (
    <ChatBubble
      username={displayName}
      message={text}
      timestamp={date}
      isModerator={isModerator}
      isVIP={isVip}
      isSubscriber={isSubscriber}
      profileImage={profileImageUrl}
    />
  );
};

export default ChatMessage;