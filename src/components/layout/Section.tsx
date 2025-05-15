import React from "react";

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * A consistent section component with optional title and description
 */
const Section = ({ children, title, description, className = "" }: SectionProps) => {
  return (
    <div className={`mb-1 h-full flex flex-col flex-grow w-full ${className}`}>
      {title && <h2 className="text-xl font-bold mb-1">{title}</h2>}
      {description && <p className="text-sm text-muted-foreground mb-1">{description}</p>}
      <div className="space-y-1 flex-grow flex flex-col h-full">
        {children}
      </div>
    </div>
  );
};

export default Section;
