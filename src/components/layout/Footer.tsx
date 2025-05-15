import { Heart, Instagram, Twitch } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-2 text-center text-xs text-muted-foreground border-t mt-auto bg-background">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-1">
          Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> by Nemi
        </div>
        <a
          href="https://www.instagram.com/prashant_yadav_se"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Instagram className="h-3 w-3" />
          prashant_yadav_se
        </a>
        <a
          href="https://www.twitch.tv/nemi_nemesis"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Twitch className="h-3 w-3" />
          nemi_nemesis
        </a>
      </div>
    </footer>
  );
};

export default Footer;
