import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Star, Award } from 'lucide-react';
import { useChatAppearance } from '@/contexts/ChatAppearanceContext';
import TwitchAvatar from './TwitchAvatar';

interface ChatBubbleProps {
  username: string;
  message: string;
  timestamp: Date;
  isCurrentUser?: boolean;
  isModerator?: boolean;
  isVIP?: boolean;
  isSubscriber?: boolean;
  profileImage?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const ChatBubble = ({
  username,
  message,
  timestamp,
  isCurrentUser = false,
  isModerator = false,
  isVIP = false,
  isSubscriber = false,
  profileImage,
  isSpeaking = false,
  isMuted = false,
  onToggleMute
}: ChatBubbleProps) => {
  // Get chat appearance settings
  const { messageAlignment, chatStyle, showTimestamps } = useChatAppearance();

  // Clean up username if it contains metadata
  let cleanUsername = username;

  // Check for IRC message format (contains first-msg, flags, etc.)
  if (username && typeof username === 'string') {
    if (username.includes('first-msg=') || username.includes('flags=')) {
      // This is a special case where the username contains Twitch metadata
      // Try to extract user-type first
      const userTypeMatch = username.match(/user-type=\s*:?([a-zA-Z0-9_]+)/);
      if (userTypeMatch && userTypeMatch[1]) {
        cleanUsername = userTypeMatch[1];
        console.log(`[ChatBubble] Extracted username from user-type: ${cleanUsername}`);
      } else {
        // Try to extract from the end of the string (last part after user-id=)
        const lastPartMatch = username.match(/user-id=(\d+);user-type=\s*:?([a-zA-Z0-9_]+)/);
        if (lastPartMatch && lastPartMatch[2]) {
          cleanUsername = lastPartMatch[2];
          console.log(`[ChatBubble] Extracted username from end of string: ${cleanUsername}`);
        } else {
          // Last resort - just use a generic name
          cleanUsername = "User";
          console.log(`[ChatBubble] Could not extract username from: ${username.substring(0, 30)}...`);
        }
      }
    }
  }

  // Format time based on chat style
  const formatTime = () => {
    const date = timestamp;

    if (chatStyle === 'whatsapp') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (chatStyle === 'discord') {
      // Discord shows "Today at HH:MM AM/PM"
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  const time = formatTime();

  // Get role-based class
  const getRoleClass = () => {
    if (isCurrentUser) return "owner-role";
    if (isModerator) return "mod-role";
    if (isVIP) return "vip-role";
    if (isSubscriber) return "sub-role";
    return "";
  };

  // Determine alignment (left or right)
  const getPositionClass = () => {
    if (messageAlignment === 'left') return "left";
    if (messageAlignment === 'right') return "right";

    // By role: moderators and VIPs on the right, others on the left
    return (isModerator || isVIP || isCurrentUser) ? "right" : "left";
  };

  // WhatsApp style
  if (chatStyle === 'whatsapp') {
    const positionClass = getPositionClass();
    const roleClass = getRoleClass();

    return (
      <div className={`whatsapp-container ${positionClass}`}>
        {/* Avatar - only show for left-aligned messages */}
        {positionClass === 'left' && (
          <div className="whatsapp-avatar">
            <TwitchAvatar
              username={cleanUsername}
              profileImageUrl={profileImage}
              size="md"
              isModerator={isModerator}
              isVIP={isVIP}
              isSubscriber={isSubscriber}
              fetchProfile={true}
            />
          </div>
        )}

        {/* Message content */}
        <div className="whatsapp-content">
          {/* Message bubble with username and message */}
          <div className={`whatsapp-bubble ${roleClass}`}>
            {/* Username - show for all messages */}
            <div className={`whatsapp-username ${roleClass}`}>
              {cleanUsername}
            </div>

            {/* Message text */}
            <div className="whatsapp-message">
              {message}
            </div>

            {/* Timestamp - inside the bubble */}
            {showTimestamps && (
              <div className="whatsapp-time">
                {time}
              </div>
            )}
          </div>
        </div>

        {/* Avatar - only show for right-aligned messages */}
        {positionClass === 'right' && (
          <div className="whatsapp-avatar">
            <TwitchAvatar
              username={cleanUsername}
              profileImageUrl={profileImage}
              size="md"
              isModerator={isModerator}
              isVIP={isVIP}
              isSubscriber={isSubscriber}
              isOwner={isCurrentUser}
              fetchProfile={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Telegram style
  if (chatStyle === 'telegram') {
    const positionClass = getPositionClass();
    const roleClass = getRoleClass();

    return (
      <div className={`telegram-container ${positionClass}`}>
        {/* Avatar for left-aligned messages */}
        {positionClass === 'left' && (
          <div className={`telegram-avatar ${roleClass}`}>
            <TwitchAvatar
              username={cleanUsername}
              profileImageUrl={profileImage}
              size="md"
              isModerator={isModerator}
              isVIP={isVIP}
              isSubscriber={isSubscriber}
              fetchProfile={true}
            />
          </div>
        )}

        {/* Message content */}
        <div className="telegram-content">
          {/* Username - show for all messages */}
          <div className={`telegram-username ${roleClass}`}>
            {cleanUsername}
          </div>

          {/* Message bubble */}
          <div className={`telegram-bubble ${roleClass}`}>
            <div className="telegram-message">
              {message}
            </div>
          </div>

          {/* Timestamp */}
          {showTimestamps && (
            <div className="telegram-time">
              {time}
              {positionClass === 'right' && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Avatar for right-aligned messages */}
        {positionClass === 'right' && (
          <div className={`telegram-avatar ${roleClass}`}>
            <TwitchAvatar
              username={cleanUsername}
              profileImageUrl={profileImage}
              size="md"
              isModerator={isModerator}
              isVIP={isVIP}
              isSubscriber={isSubscriber}
              isOwner={isCurrentUser}
              fetchProfile={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Discord style
  if (chatStyle === 'discord') {
    const roleClass = getRoleClass();

    return (
      <div className="chat-message-container discord-container">
        {/* Avatar always on the left for Discord */}
        <div className="chat-avatar left discord-avatar">
          <TwitchAvatar
            username={cleanUsername}
            profileImageUrl={profileImage}
            size="md"
            isModerator={isModerator}
            isVIP={isVIP}
            isSubscriber={isSubscriber}
            fetchProfile={true}
          />
        </div>

        <div className="chat-content left discord-content">
          {/* Header with username, badges, and timestamp */}
          <div className="discord-header">
            <span className={`discord-username ${roleClass}`}>
              {cleanUsername}
            </span>

            {/* Badges */}
            <div className="discord-badges">
              {isModerator && (
                <div className="discord-badge mod-badge">MOD</div>
              )}
              {isVIP && (
                <div className="discord-badge vip-badge">VIP</div>
              )}
              {isSubscriber && (
                <div className="discord-badge sub-badge">SUB</div>
              )}
            </div>

            {/* Timestamp */}
            {showTimestamps && (
              <span className="discord-time">{time}</span>
            )}
          </div>

          {/* Message content */}
          <div className="discord-message">
            {message}
          </div>
        </div>
      </div>
    );
  }

  // Twitch style
  if (chatStyle === 'twitch') {
    const roleClass = getRoleClass();

    return (
      <div className="chat-message-container twitch-container">
        <div className="twitch-message-row">
          {/* Badges */}
          <div className="twitch-badges">
            {isModerator && (
              <div className="twitch-badge mod-badge">
                <Shield className="h-3 w-3" />
              </div>
            )}
            {isVIP && (
              <div className="twitch-badge vip-badge">
                <Star className="h-3 w-3" />
              </div>
            )}
            {isSubscriber && (
              <div className="twitch-badge sub-badge">
                <Award className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Username */}
          <span className={`twitch-username ${roleClass}`}>
            {cleanUsername}
          </span>

          {/* Colon */}
          <span className="twitch-colon">:</span>

          {/* Message content */}
          <span className="twitch-message">
            {message}
          </span>

          {/* Timestamp */}
          {showTimestamps && (
            <span className="twitch-time">{time}</span>
          )}
        </div>
      </div>
    );
  }

  // Classic style
  if (chatStyle === 'classic') {
    const positionClass = getPositionClass();
    const roleClass = getRoleClass();

    return (
      <div className="chat-message-container">
        {/* Avatar */}
        <div className={`chat-avatar ${positionClass}`}>
          <TwitchAvatar
            username={cleanUsername}
            profileImageUrl={profileImage}
            size="md"
            isModerator={isModerator}
            isVIP={isVIP}
            isSubscriber={isSubscriber}
            isOwner={isCurrentUser && positionClass === 'right'}
            fetchProfile={true}
          />
        </div>

        {/* Content */}
        <div className={`chat-content ${positionClass}`}>
          {/* Username */}
          <div className={`chat-username classic ${roleClass}`}>
            {cleanUsername}
          </div>

          {/* Message bubble */}
          <div className={`chat-bubble classic ${positionClass} ${roleClass}`}>
            {message}
          </div>

          {/* Timestamp */}
          {showTimestamps && (
            <div className="chat-timestamp classic">
              {time}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact style
  if (chatStyle === 'compact') {
    const roleClass = getRoleClass();

    return (
      <div className="chat-message-container compact-container">
        <div className="compact-message-row">
          {/* Badges */}
          <div className="compact-badges">
            {isModerator && (
              <div className="compact-badge mod-badge">
                <Shield className="h-2 w-2" />
              </div>
            )}
            {isVIP && (
              <div className="compact-badge vip-badge">
                <Star className="h-2 w-2" />
              </div>
            )}
            {isSubscriber && (
              <div className="compact-badge sub-badge">
                <Award className="h-2 w-2" />
              </div>
            )}
          </div>

          {/* Username */}
          <span className={`compact-username ${roleClass}`}>
            {cleanUsername}
          </span>

          {/* Message content */}
          <span className="compact-message">
            {message}
          </span>

          {/* Timestamp */}
          {showTimestamps && (
            <span className="compact-time">{time}</span>
          )}
        </div>
      </div>
    );
  }

  // Default fallback (should never happen)
  return (
    <div className="chat-message-container">
      <div className="chat-content left">
        <div className="chat-username">{cleanUsername}</div>
        <div className="chat-bubble">{message}</div>
        {showTimestamps && <div className="chat-timestamp">{time}</div>}
      </div>
    </div>
  );
};

export default ChatBubble;
