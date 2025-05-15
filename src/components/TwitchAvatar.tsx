import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import twitchProfileService from '@/services/twitch/TwitchProfileService';
import './TwitchAvatar.css';

interface TwitchAvatarProps {
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  isLive?: boolean;
  isModerator?: boolean;
  isVIP?: boolean;
  isSubscriber?: boolean;
  isOwner?: boolean;
  fetchProfile?: boolean;
}

/**
 * Enhanced Twitch Avatar component
 *
 * Features:
 * - Automatic profile fetching (optional)
 * - Robust image error handling
 * - Consistent fallback with user's initial
 * - Role-based styling
 * - Live status indicator
 */
const TwitchAvatar: React.FC<TwitchAvatarProps> = ({
  username,
  displayName,
  profileImageUrl,
  size = 'md',
  className = '',
  showBadge = false,
  isLive = false,
  isModerator = false,
  isVIP = false,
  isSubscriber = false,
  isOwner = false,
  fetchProfile = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [loadedProfileImageUrl, setLoadedProfileImageUrl] = useState<string | null>(profileImageUrl || null);
  const [loadedDisplayName, setLoadedDisplayName] = useState(displayName || username);

  // Get the display name or username to show in fallback
  const name = loadedDisplayName || username || 'User';

  // Get the first letter for the fallback
  const initial = name.charAt(0).toUpperCase();

  // Determine role class
  const getRoleClass = () => {
    if (isOwner) return 'twitch-avatar-owner';
    if (isModerator) return 'twitch-avatar-moderator';
    if (isVIP) return 'twitch-avatar-vip';
    if (isSubscriber) return 'twitch-avatar-subscriber';
    return 'twitch-avatar-default';
  };

  // Fetch profile if needed
  useEffect(() => {
    if (fetchProfile && username) {
      const normalizedUsername = username.toLowerCase().trim();

      // Fetch the profile
      twitchProfileService.getUserProfile(normalizedUsername)
        .then(profile => {
          if (profile) {
            // Update the display name and profile image URL
            setLoadedDisplayName(profile.displayName || username);

            if (profile.profileImageUrl && profile.imageStatus !== 'invalid') {
              setLoadedProfileImageUrl(profile.profileImageUrl);
            } else {
              // Use default image or null
              setLoadedProfileImageUrl(twitchProfileService.getDefaultProfileImage());
            }
          }
        })
        .catch(error => {
          console.error(`[TwitchAvatar] Error fetching profile for ${username}:`, error);
        });
    }
  }, [username, fetchProfile]);

  // Check image validity on mount or when URL changes
  useEffect(() => {
    // Reset error state when URL changes
    setImageError(false);

    // If we have a profile image URL, validate it
    if (loadedProfileImageUrl) {
      const img = new Image();

      img.onload = () => {
        setImageError(false);
      };

      img.onerror = () => {
        console.warn(`[TwitchAvatar] Failed to load image for ${username} from ${loadedProfileImageUrl}`);
        setImageError(true);
      };

      img.src = loadedProfileImageUrl;
    }
  }, [loadedProfileImageUrl, username]);

  return (
    <div className={cn('twitch-avatar', `twitch-avatar-${size}`, className)}>
      {loadedProfileImageUrl && !imageError ? (
        <img
          src={loadedProfileImageUrl}
          alt={name}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className={cn('twitch-avatar-fallback', getRoleClass())}>
          <span>{initial}</span>
        </div>
      )}

      {/* Status badge */}
      {showBadge && isLive && (
        <div className="twitch-avatar-badge live" />
      )}
    </div>
  );
};

export default TwitchAvatar;
