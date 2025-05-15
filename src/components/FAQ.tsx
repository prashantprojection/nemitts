import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FAQProps {
  className?: string;
}

/**
 * FAQ component that displays information about the application
 * and ways to support the developer
 */
const FAQ = ({ className = "" }: FAQProps) => {
  return (
    <Card className={`w-full shadow-lg border-twitch/20 h-full ${className}`}>
      <CardHeader className="twitch-gradient text-white">
        <CardTitle className="text-xl flex items-center">
          <InfoIcon className="mr-2 h-5 w-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-sm">
        <div>
          <h3 className="font-bold mb-1">What is Twitch TTS Reader?</h3>
          <p className="text-muted-foreground">A tool that reads your Twitch chat messages aloud using text-to-speech technology, so you never miss important messages while streaming.</p>
        </div>

        {/* Removed ads-related FAQ */}

        <div>
          <h3 className="font-bold mb-1">How can I support the developer?</h3>
          <p className="text-muted-foreground">If you find this tool useful, consider supporting the developer via PayPal to help with server costs and future improvements.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full flex items-center justify-center gap-2"
            onClick={() => window.open('mailto:py2738@gmail.com', '_blank')}
          >
            <DollarSign className="h-4 w-4" />
            Support via PayPal: py2738@gmail.com
          </Button>
        </div>

        <div>
          <h3 className="font-bold mb-1">Is my data secure?</h3>
          <p className="text-muted-foreground">Yes! We only store the settings you choose and don't share your data with third parties (except for anonymous analytics).</p>
        </div>

        <div>
          <h3 className="font-bold mb-1">Need more help?</h3>
          <p className="text-muted-foreground">Contact the developer at py2738@gmail.com for support or feature requests.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FAQ;
