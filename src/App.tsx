import * as React from "react";
import { Suspense, lazy } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { KeyboardShortcutProvider } from "@/contexts/KeyboardShortcutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatAppearanceProvider } from "@/contexts/ChatAppearanceContext";
import { SpeechServiceProvider } from "@/contexts/SpeechServiceContext";
import ServiceInitializer from "@/components/ServiceInitializer";

// Use React.lazy for code splitting
const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));
const Obs = lazy(() => import("./pages/Obs"));
const MultiZone = lazy(() => import("./pages/MultiZone"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-lg shadow-lg border border-border/50">
      <LoadingSpinner size="lg" text="Loading TTS Reader..." />
    </div>
  </div>
);

const App = () => {
  // Initialize theme from localStorage on app load
  React.useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const validThemes = ['light', 'dark', 'light-blue', 'light-green', 'blue', 'purple', 'red'];

    if (storedTheme && validThemes.includes(storedTheme)) {
      // Remove any existing theme classes
      document.documentElement.classList.remove(...validThemes);
      // Add the stored theme class
      document.documentElement.classList.add(storedTheme);
    } else {
      // Default to light theme if no valid theme is stored
      document.documentElement.classList.add('light');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <SessionProvider>
            <ChatAppearanceProvider>
              <KeyboardShortcutProvider>
                <SpeechServiceProvider>
                  {/* Initialize services */}
                  <ServiceInitializer />

                  <div className="min-h-screen flex flex-col bg-background text-foreground antialiased transition-colors duration-200">
                    <BrowserRouter>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/obs" element={<Obs />} />
                          <Route path="/multi-zone" element={<MultiZone />} />
                          {/* Stream Deck API route removed */}
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </BrowserRouter>
                  </div>
                </SpeechServiceProvider>
              </KeyboardShortcutProvider>
            </ChatAppearanceProvider>
          </SessionProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
