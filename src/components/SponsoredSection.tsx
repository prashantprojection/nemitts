import React from 'react';
import { ExternalLink } from 'lucide-react';

interface SponsoredProfileData {
  id: string;
  name: string;
  url: string;
  imageUrl?: string;
}

interface SponsoredSectionProps {
  sponsoredItems: SponsoredProfileData[];
}

const SponsoredSection: React.FC<SponsoredSectionProps> = ({ sponsoredItems }) => {
  if (!sponsoredItems || sponsoredItems.length === 0) {
    return null;
  }

  return (
    <div className="p-3 border-b border-border/30">
      <h3 className="mb-2 text-xs font-semibold text-muted-foreground px-1 tracking-wider uppercase">Sponsored</h3>
      <div className="space-y-1.5">
        {sponsoredItems.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 rounded-lg hover:bg-muted/30 transition-colors group"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-5 h-5 rounded-full mr-2.5" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted mr-2.5 flex items-center justify-center text-muted-foreground text-xs">
                {item.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-foreground flex-1 truncate group-hover:text-primary">{item.name}</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default SponsoredSection;