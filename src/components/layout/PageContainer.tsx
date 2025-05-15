import React from "react";
import Footer from "./Footer";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
}

/**
 * A consistent container for page content
 * Provides fixed width, centered layout with consistent padding
 */
const PageContainer = ({
  children,
  className = "",
  showFooter = true
}: PageContainerProps) => {
  return (
    <div className="min-h-screen flex flex-col h-screen overflow-y-auto">
      <div className={`container mx-auto px-2 sm:px-4 py-2 max-w-7xl flex-grow flex flex-col ${className}`}>
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
};

export default PageContainer;
