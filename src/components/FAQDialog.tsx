import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Search, InfoIcon, Mail, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// FAQ data structure
interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What is Twitch TTS Reader?",
    answer: "A tool that reads your Twitch chat messages aloud using text-to-speech technology, so you never miss important messages while streaming. It connects to any Twitch channel and converts chat messages to speech in real-time.",
    category: "general"
  },
  {
    question: "How do I connect to a Twitch channel?",
    answer: (
      <div className="space-y-2">
        <p>To connect to a Twitch channel:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Log in with your Twitch account</li>
          <li>Enter the channel name in the input field</li>
          <li>Click "Connect to Chat"</li>
        </ol>
      </div>
    ),
    category: "usage"
  },
  {
    question: "Can I customize the TTS voice?",
    answer: (
      <div className="space-y-2">
        <p>Yes! You can customize the TTS voice in the Settings page:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click the "Settings" button</li>
          <li>Go to the "Voice" tab</li>
          <li>Select your preferred voice from the dropdown</li>
          <li>Adjust rate, pitch, and volume as needed</li>
          <li>Click "Save" to apply your changes</li>
        </ol>
        <p>Your voice settings will be saved permanently and will be used every time you return to the app.</p>
      </div>
    ),
    category: "customization"
  },
  {
    question: "Can I assign different voices to specific users?",
    answer: (
      <div className="space-y-2">
        <p>Yes! You can assign custom voices to specific Twitch users:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Go to the Settings page</li>
          <li>Navigate to the "Users" tab</li>
          <li>Add a new user assignment</li>
          <li>Enter the username and select a voice</li>
          <li>Save your changes</li>
        </ol>
        <p>You can also assign voices based on user roles (subscribers, VIPs, moderators) with a priority system.</p>
      </div>
    ),
    category: "customization"
  },
  {
    question: "How does the priority system for voices work?",
    answer: (
      <div className="space-y-2">
        <p>The application uses a priority system for voice assignments:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Individual user assignments have the highest priority</li>
          <li>Role-based assignments (VIPs, subscribers, moderators) come next</li>
          <li>The general voice setting is used as a fallback</li>
        </ol>
        <p>This means if a user has a specific voice assigned, that voice will be used regardless of their roles.</p>
      </div>
    ),
    category: "customization"
  },
  {
    question: "How do I filter out certain messages?",
    answer: (
      <div className="space-y-2">
        <p>You can filter messages in the Settings page under the "Filters" tab:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Skip messages containing links</li>
          <li>Skip messages with emotes</li>
          <li>Skip messages from specific users (blacklist)</li>
          <li>Skip messages from known Twitch bots</li>
          <li>Only read messages from specific users (whitelist)</li>
          <li>Toggle whether to say usernames before messages</li>
        </ul>
        <p>Each filter can be toggled independently and settings are saved permanently.</p>
      </div>
    ),
    category: "filters"
  },
  {
    question: "Can I use this with OBS?",
    answer: (
      <div className="space-y-2">
        <p>Yes! There's built-in OBS integration:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Go to Settings → Integrations</li>
          <li>Find the OBS Integration section</li>
          <li>Copy the browser source URL</li>
          <li>Add a Browser Source in OBS with this URL</li>
        </ol>
        <p>You can customize the overlay appearance including colors, fonts, and animations.</p>
      </div>
    ),
    category: "integrations"
  },
  {
    question: "Is there Stream Deck support?",
    answer: (
      <div className="space-y-2">
        <p>Yes! You can control the TTS reader with your Stream Deck:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Go to Settings → Integrations → Stream Deck</li>
          <li>Copy the URLs for different actions (mute, skip, clear)</li>
          <li>Add Website buttons in Stream Deck software</li>
          <li>Paste the URLs to create control buttons</li>
        </ul>
      </div>
    ),
    category: "integrations"
  },

  {
    question: "How does it handle Twitch emotes?",
    answer: (
      <div className="space-y-2">
        <p>The app can filter Twitch emotes from messages:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You can enable the "Skip emotes in messages" filter</li>
          <li>When enabled, emotes will be filtered out while the rest of the message is still read</li>
          <li>This helps prevent TTS from reading emote codes that might disrupt the flow</li>
        </ul>
        <p>You can configure this behavior in the Filters section of Settings.</p>
      </div>
    ),
    category: "features"
  },
  // Removed ads-related FAQ
  {
    question: "How can I support the developer?",
    answer: (
      <div className="space-y-2">
        <p>If you find this tool useful, consider supporting the developer via PayPal to help with server costs and future improvements.</p>
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
    ),
    category: "general"
  },
  {
    question: "Is my data secure?",
    answer: "Yes! We only store the settings you choose and don't share your data with third parties (except for anonymous analytics). Your Twitch authentication is handled securely through Twitch's official OAuth system.",
    category: "privacy"
  },
  {
    question: "Do my settings persist between sessions?",
    answer: (
      <div className="space-y-2">
        <p>Yes! All your settings are saved permanently:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Voice selections and customizations</li>
          <li>Filter preferences</li>
          <li>User voice assignments</li>
          <li>OBS and integration settings</li>
        </ul>
        <p>Your settings are stored locally and synchronized with our database when you're logged in with Twitch.</p>
      </div>
    ),
    category: "usage"
  },
  {
    question: "Need more help?",
    answer: "Contact the developer at py2738@gmail.com for support or feature requests. We're always looking to improve the application based on user feedback.",
    category: "general"
  }
];

const FAQDialog = ({ open, onOpenChange }: FAQDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFAQs, setFilteredFAQs] = useState<FAQItem[]>(faqItems);

  // Filter FAQs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFAQs(faqItems);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = faqItems.filter(
      item =>
        item.question.toLowerCase().includes(query) ||
        (typeof item.answer === 'string' && item.answer.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query)
    );

    setFilteredFAQs(filtered);
  }, [searchQuery]);

  const openSupportEmail = () => {
    window.open('mailto:py2738@gmail.com?subject=Twitch%20TTS%20Reader%20Support', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="absolute right-14 top-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            onClick={openSupportEmail}
          >
            <Mail className="h-4 w-4" />
            Support
          </Button>
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <InfoIcon className="mr-2 h-5 w-5" />
            Frequently Asked Questions
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto pr-2">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filteredFAQs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-muted-foreground">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FAQDialog;
