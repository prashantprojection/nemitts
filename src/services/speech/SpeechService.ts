
// Toast functionality removed
import { SpeechOptions } from "./types";
import voiceManager from "./voiceManager";
import settingsManager from "./settingsManager";
import speechQueue from "./speechQueue";

export class SpeechService {
  constructor() {
    // Wait for voices to load before loading settings
    setTimeout(async () => {
      const settings = await this.loadSettings();
      if (settings) {
        speechQueue.setOptions(settings);
      }
    }, 500);
  }

  public async loadSettings(): Promise<SpeechOptions | null> {
    return settingsManager.loadSettings();
  }

  public async saveSettings(options: SpeechOptions): Promise<boolean> {
    const success = await settingsManager.saveSettings(options);
    if (success) {
      speechQueue.setOptions(options);
    }
    return success;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return voiceManager.getVoices();
  }

  public setOptions(options: SpeechOptions): void {
    speechQueue.setOptions(options);
  }

  public speak(text: string, priority: number = 0): void {
    speechQueue.speak(text, priority);
  }

  public shouldReadMessage(message: string): boolean {
    return speechQueue.shouldReadMessage(message);
  }

  public formatMessageForSpeech(username: string, message: string): string {
    return speechQueue.formatMessageForSpeech(username, message);
  }

  public stop(): void {
    speechQueue.stop();
  }

  public pause(): void {
    speechQueue.pause();
  }

  public resume(): void {
    speechQueue.resume();
  }

  public isSpeaking(): boolean {
    return speechQueue.isSpeaking();
  }

  public getOptions(): SpeechOptions {
    return speechQueue.getOptions();
  }
}

// Singleton instance
const speechService = new SpeechService();
export default speechService;
