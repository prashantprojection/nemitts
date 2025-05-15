import * as React from "react";
import { Suspense, useState, lazy } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import TwitchLogin from "@/components/TwitchLogin";
import twitchAuthService from "@/services/twitch/TwitchAuthService";

// Use ChatContainer directly instead of TTSChat
import ChatContainer from "@/components/ChatContainer";
import ChannelProfileSidebar from "@/components/ChannelProfileSidebar";
import RightPanel from "@/components/RightPanel";
import QuickVoiceAccess from "@/components/sidebar/QuickVoiceAccess"; // Add this import

// Lazy load the FAQ dialog
const FAQDialog = lazy(() => import("@/components/FAQDialog"));

const Index = () => {
  const [showFAQDialog, setShowFAQDialog] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login status on component mount
  React.useEffect(() => {
    const authState = twitchAuthService.getAuthState();
    setIsLoggedIn(authState.isLoggedIn);

    // Set up auth change listener
    const handleAuthChange = (newState: any) => {
      setIsLoggedIn(newState.isLoggedIn);
    };

    twitchAuthService.addStateChangeListener(handleAuthChange);

    // Clean up when component unmounts
    return () => {
      twitchAuthService.removeStateChangeListener(handleAuthChange);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-b from-background to-background/90 p-3">
      {/* Desktop-optimized App Header */}
      <header className="flex items-center justify-between bg-card text-foreground h-14 rounded-xl shadow-md z-50 mb-3">
        <div className="flex items-center h-full">
          <div className="flex items-center gap-3 px-5 h-full">
            <img src="/logo-small.svg" alt="TTS Reader Logo" className="w-7 h-7" />
            <h1 className="text-lg font-medium bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">TTS Reader</h1>
          </div>
        </div>

        <div className="flex items-center h-full pr-4">
          {/* Show TwitchLogin button if not logged in */}
          {!isLoggedIn && (
            <TwitchLogin onLoginChange={setIsLoggedIn} />
          )}
        </div>
      </header>

      {/* FAQ Dialog */}
      <Suspense fallback={<div />}>
        <FAQDialog open={showFAQDialog} onOpenChange={setShowFAQDialog} />
      </Suspense>

      {/* Enhanced Main Content Area - Three-Zone Layout */}
      <div className="flex w-full h-full flex-grow overflow-hidden">
        {/* Three-zone layout: Left sidebar, Center content, Right settings */}
        <div className="flex-1 flex overflow-hidden gap-3 w-full">
          {/* Left Zone - Channel Profiles Sidebar - Always visible */}
          <div className="w-[25%] h-full flex-shrink-0 relative z-10 bg-card rounded-xl shadow-md overflow-hidden">
            {/* <ChannelProfileSidebar /> */}
            <QuickVoiceAccess /> {/* Replace ChannelProfileSidebar with QuickVoiceAccess */}
          </div>

          {/* Center Zone - Chat Container */}
          <div className="flex-1 h-full flex flex-col bg-card rounded-xl shadow-md overflow-hidden max-w-[50%] mx-auto">
            <ChatContainer />
          </div>

          {/* Right Zone - Menu Panel - Always visible */}
          <div className="w-[25%] h-full overflow-hidden bg-card rounded-xl shadow-md flex-shrink-0 relative z-10">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="p-6">
                  <LoadingSpinner size="sm" text="Loading..." />
                </div>
              </div>
            }>
              <RightPanel
                onClose={() => {}} // Empty function since we don't close the panel anymore
                onShowFAQ={() => setShowFAQDialog(true)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
