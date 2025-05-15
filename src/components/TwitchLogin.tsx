
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import twitchAuthService, { AuthState } from "@/services/twitch/TwitchAuthService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
// Debug imports removed - automatic token refresh implemented

interface TwitchLoginProps {
  onLoginChange?: (isLoggedIn: boolean) => void;
}

const TwitchLogin = ({ onLoginChange }: TwitchLoginProps) => {
  // Use session context for persistent login state
  const { isLoggedIn, setIsLoggedIn, channelName, setChannelName } = useSession();

  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    isLoggedIn: false,
    username: null,
    channelName: null,
    profileImageUrl: null,
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  // Debug dialog removed - automatic token refresh implemented
  const [errorInfo, setErrorInfo] = useState({error: "", description: ""});

  useEffect(() => {
    const handleAuthChange = (newState: AuthState) => {
      setAuthState(newState);
      onLoginChange?.(newState.isLoggedIn);

      // Update session context
      setIsLoggedIn(newState.isLoggedIn);
      if (newState.channelName) {
        setChannelName(newState.channelName);
      }

      if (newState.isLoggedIn) {
        setIsLoggingIn(false);

        // Dispatch an event to notify other components about the login state change
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { isLoggedIn: true, username: newState.username }
        }));
      } else {
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { isLoggedIn: false }
        }));
      }
    };

    // Check for error parameters in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    if (error) {
      setErrorInfo({
        error,
        description: errorDescription || "Unknown error"
      });
      setShowErrorDialog(true);

      // Clean URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Add auth state change listener
    twitchAuthService.addStateChangeListener(handleAuthChange);

    // If we're in the middle of logging in and we get a successful auth state,
    // make sure to update the UI
    if (isLoggingIn && twitchAuthService.getAuthState().isLoggedIn) {
      setIsLoggingIn(false);
    }

    return () => {
      twitchAuthService.removeStateChangeListener(handleAuthChange);
    };
  }, [onLoginChange, isLoggingIn]);

  const handleLogin = () => {
    try {
      setIsLoggingIn(true);

      // Show dialog to explain the login process
      setShowAuthDialog(true);
    } catch (error) {
      toast.error("Failed to start login process. Please try again.");
      setIsLoggingIn(false);
    }
  };

  const proceedWithLogin = (force: boolean = false) => {
    setShowAuthDialog(false);
    twitchAuthService.login(force);
  };

  const handleLogout = () => {
    twitchAuthService.logout();
  };

  // Debug functions removed - automatic token refresh implemented

  return (
    <div className="flex items-center gap-2">
      {!authState.isLoggedIn ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleLogin}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary-foreground/10 shadow-lg font-medium transition-all rounded-md px-4 py-2"
            disabled={isLoggingIn}
            size={"sm"}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.3 3H21v11.7l-4.7 4.7h-3.9l-2.5 2.4H7v-2.4H3V6.2L4.3 3zM5 17.4h4v2.4h.095l2.5-2.4h3.877L19 13.574V5H5v12.4zM15 8h2v4.7h-2V8zm0 0M9 8h2v4.7H9V8z" />
            </svg>
            {isLoggingIn ? "Connecting..." : "Login with Twitch"}
          </Button>

          {/* Debug button removed - automatic token refresh implemented */}
        </div>
      ) : (
        <span className="text-foreground font-medium">Connected</span>
      )}

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="bg-card border-border shadow-xl transition-colors duration-200">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.3 3H21v11.7l-4.7 4.7h-3.9l-2.5 2.4H7v-2.4H3V6.2L4.3 3zM5 17.4h4v2.4h.095l2.5-2.4h3.877L19 13.574V5H5v12.4zM15 8h2v4.7h-2V8zm0 0M9 8h2v4.7H9V8z" />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-xl text-center">Connect to Twitch</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              You'll be redirected to Twitch to authorize this application. Once authorized, you'll be brought back to this app automatically.
            </DialogDescription>
            <div className="mt-2 text-muted-foreground/70 text-sm text-center">
              This will ensure a fresh login session with Twitch.
            </div>
          </DialogHeader>
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAuthDialog(false)} className="border-border text-muted-foreground hover:bg-muted hover:text-foreground">
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => proceedWithLogin(true)}>
              Continue to Twitch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="bg-card border-border shadow-xl transition-colors duration-200">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-destructive/10 p-3 rounded-full">
                <svg className="h-8 w-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-xl text-center text-destructive">Authentication Error</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {errorInfo.error === "redirect_mismatch" ? (
                <div className="space-y-3 mt-4">
                  <p>There's a redirect URL mismatch with your Twitch Developer application.</p>
                  <div className="bg-muted p-3 rounded-md border border-border">
                    <p className="text-sm font-medium text-foreground">Current URL:</p>
                    <code className="bg-muted/70 p-1.5 rounded text-xs block mt-1 font-mono text-foreground">{window.location.origin}</code>
                  </div>
                  <p className="mt-2 text-primary font-medium">Please make sure you've added this exact URL to your Twitch Developer Console under OAuth Redirect URLs.</p>
                  <p className="font-medium text-foreground">Please try the following:</p>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>Go to your <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitch Developer Console</a></li>
                    <li>Select your application</li>
                    <li>Add <code className="bg-muted/70 p-1 rounded text-xs font-mono text-foreground">{window.location.origin}</code> to the OAuth Redirect URLs</li>
                    <li>Save changes</li>
                    <li>Clear your browser cache and cookies</li>
                    <li>Try logging in again</li>
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-center">{errorInfo.description || errorInfo.error}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-6">
            {window.location.hostname === 'localhost' && (
              <Button variant="outline" onClick={() => window.location.href = "http://localhost:8080"} className="border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                Go to localhost:8080
              </Button>
            )}
            {errorInfo.error === "redirect_mismatch" && (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => window.open("https://dev.twitch.tv/console/apps", "_blank")}>
                Open Twitch Developer Console
              </Button>
            )}
            <Button
              onClick={() => {
                setShowErrorDialog(false);
                // Clear any auth state to ensure a fresh start
                twitchAuthService.logout();
              }}
              className="bg-muted hover:bg-muted/80 text-foreground"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debug dialog removed - automatic token refresh implemented */}
    </div>
  );
};

export default TwitchLogin;
