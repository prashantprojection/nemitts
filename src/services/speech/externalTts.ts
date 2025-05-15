// Toast functionality removed

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
}

interface ElevenLabsResponse {
  voices?: ElevenLabsVoice[];
  error?: {
    message: string;
  };
}

interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
  };
}

/**
 * Service for interacting with ElevenLabs API
 */
export class ExternalTtsService {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  private voices: ElevenLabsVoice[] = [];
  private selectedVoiceId: string = '';
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;

  /**
   * Initialize the service with an API key
   */
  public initialize(apiKey: string): void {
    this.apiKey = apiKey;
    this.audioContext = new AudioContext();
    this.fetchVoices();
  }

  /**
   * Check if the service is initialized
   */
  public isInitialized(): boolean {
    return !!this.apiKey && !!this.audioContext;
  }

  /**
   * Fetch available voices from ElevenLabs
   */
  public async fetchVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.apiKey) {
      console.error('API key not set');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const data: ElevenLabsResponse = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.voices) {
        this.voices = data.voices;

        // Set default voice if none selected
        if (!this.selectedVoiceId && this.voices.length > 0) {
          this.selectedVoiceId = this.voices[0].voice_id;
        }

        return this.voices;
      }

      return [];
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      toast.error('Failed to fetch ElevenLabs voices');
      return [];
    }
  }

  /**
   * Get available voices
   */
  public getVoices(): ElevenLabsVoice[] {
    return this.voices;
  }

  /**
   * Set the voice to use for TTS
   */
  public setVoice(voiceId: string): void {
    this.selectedVoiceId = voiceId;
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  public async textToSpeech(text: string, voiceId?: string): Promise<ArrayBuffer | null> {
    if (!this.apiKey) {
      console.error('API key not set');
      return null;
    }

    const useVoiceId = voiceId || this.selectedVoiceId;

    if (!useVoiceId) {
      console.error('No voice selected');
      return null;
    }

    // ElevenLabs has a character limit (typically around 5000 chars)
    // Let's enforce a safe limit to prevent API errors
    const maxLength = 4000;
    if (text.length > maxLength) {
      console.warn(`Text exceeds ElevenLabs character limit (${text.length}/${maxLength}), truncating...`);
      text = text.substring(0, maxLength) + '...';
    }

    try {
      const request: TextToSpeechRequest = {
        text,
        voice_id: useVoiceId,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };

      const response = await fetch(`${this.baseUrl}/text-to-speech/${useVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to convert text to speech');
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error converting text to speech:', error);
      toast.error('Failed to convert text to speech');
      return null;
    }
  }

  /**
   * Play audio from ArrayBuffer
   */
  public async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      // Add to queue
      this.audioQueue.push(audioData);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.processAudioQueue();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
    }
  }

  /**
   * Process the audio queue
   */
  private async processAudioQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift();

    if (!audioData || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // When finished, play the next item in queue
      source.onended = () => {
        this.processAudioQueue();
      };

      source.start();
    } catch (error) {
      console.error('Error processing audio:', error);
      // Continue with next item in queue
      this.processAudioQueue();
    }
  }

  /**
   * Speak text using ElevenLabs API
   */
  public async speak(text: string, voiceId?: string): Promise<boolean> {
    if (!this.isInitialized()) {
      console.error('External TTS service not initialized');
      return false;
    }

    try {
      const audioData = await this.textToSpeech(text, voiceId);

      if (!audioData) {
        return false;
      }

      await this.playAudio(audioData);
      return true;
    } catch (error) {
      console.error('Error speaking with ElevenLabs:', error);
      return false;
    }
  }

  /**
   * Stop all audio playback
   */
  public stop(): void {
    if (this.audioContext) {
      // Create a new audio context to stop all sounds
      this.audioContext.close();
      this.audioContext = new AudioContext();
      this.audioQueue = [];
      this.isPlaying = false;
    }
  }

  /**
   * Test the ElevenLabs API connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      toast.error('API key not set');
      return false;
    }

    try {
      const voices = await this.fetchVoices();
      if (voices.length > 0) {
        toast.success('Successfully connected to ElevenLabs API');
        return true;
      } else {
        toast.error('No voices found in your ElevenLabs account');
        return false;
      }
    } catch (error) {
      console.error('Error testing ElevenLabs connection:', error);
      toast.error('Failed to connect to ElevenLabs API');
      return false;
    }
  }
}

// Create a singleton instance
const externalTtsService = new ExternalTtsService();
export default externalTtsService;
