import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, HelpCircle, LogOut, Moon, Sun, LayoutDashboard } from 'lucide-react';
import twitchAuthService from '@/services/twitch/TwitchAuthService';
import { useSession } from '@/contexts/SessionContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfileMenuProps {
  onShowFAQ: () => void;
}

const ProfileMenu = ({ onShowFAQ }: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { isLoggedIn } = useSession();
  const authState = twitchAuthService.getAuthState();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    // Apply theme change to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', newTheme);

    // Dispatch theme change event
    const event = new CustomEvent('theme-changed', {
      detail: { theme: newTheme }
    });
    window.dispatchEvent(event);
  };

  const handleLogout = () => {
    twitchAuthService.logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center cursor-pointer h-full px-4 border-l border-primary/10 hover:bg-primary/10 transition-colors">
          {isLoggedIn && authState.profileImageUrl ? (
            <img
              key={`profile-img-${authState.username}`}
              src={authState.profileImageUrl}
              alt={authState.username || "User"}
              className="w-8 h-8 rounded-full border border-primary/30"
              onError={(e) => {
                console.error(`[ProfileMenu] Failed to load profile image for ${authState.username}`);
                // Hide the image and show the fallback
                e.currentTarget.style.display = 'none';
                // Force a re-render to show the fallback
                twitchAuthService.updateProfileImage('');
              }}
            />
          ) : isLoggedIn ? (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <div className="font-semibold text-lg text-primary">
                {authState.username ? authState.username.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-primary" />
              ) : (
                <Moon className="h-4 w-4 text-primary" />
              )}
            </div>
          )}
          <span className="ml-2 font-medium text-sm hidden sm:inline-block">
            {isLoggedIn ? (authState.username || "Profile") : "Settings"}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg text-foreground">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {isLoggedIn ? (
              <>
                <a
                  href={`https://twitch.tv/${authState.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-none hover:underline cursor-pointer"
                  title={`Open ${authState.username}'s Twitch channel`}
                >
                  {authState.username || "User"}
                </a>
                <p className="text-xs leading-none text-muted-foreground">Twitch Account</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium leading-none">Guest User</p>
                <p className="text-xs leading-none text-muted-foreground">Application Settings</p>
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoggedIn && (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => window.open(`https://dashboard.twitch.tv/u/${authState.username}/stream-manager`, '_blank')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Creator Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={onShowFAQ}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>FAQ</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>
        {isLoggedIn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
