
import { toast } from "sonner";

export class VoiceManager {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.initVoices();
  }

  private initVoices(): void {
    // Get voices on load
    this.loadVoices();

    // Chrome needs this event to load voices
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
    }
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log("Available voices loaded:", this.voices.length);
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public getVoiceByName(name: string): SpeechSynthesisVoice | undefined {
    if (!name) return undefined;
    return this.voices.find(v => v.name === name);
  }

  // We don't use default voices anymore - only saved settings
}

// Singleton instance
const voiceManager = new VoiceManager();
export default voiceManager;
