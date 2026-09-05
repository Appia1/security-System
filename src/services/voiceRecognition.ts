/**
 * Voice Recognition Service for Safe Word Detection
 * Integrates Web Speech Recognition API with fuzzy phrase matching
 */

// Extend window interface for webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceStatus = 'idle' | 'listening' | 'detected' | 'unsupported' | 'error';

export interface VoiceListenerOptions {
  safeWord: string;
  onSafeWordDetected: (detectedWord: string, fullTranscript: string) => void;
  onTranscript?: (transcript: string) => void;
  onStatusChange?: (status: VoiceStatus, message?: string) => void;
}

export class SafeWordVoiceDetector {
  private recognition: any = null;
  private isRunning: boolean = false;
  private safeWord: string = '';
  private onSafeWordDetected?: (detectedWord: string, fullTranscript: string) => void;
  private onTranscript?: (transcript: string) => void;
  private onStatusChange?: (status: VoiceStatus, message?: string) => void;
  private restartTimeout: any = null;

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.setupHandlers();
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }
  }

  public isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private setupHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isRunning = true;
      this.onStatusChange?.('listening', 'Microphone active. Listening covertly for safe word...');
    };

    this.recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }

      const cleanTranscript = currentTranscript.trim().toLowerCase();
      this.onTranscript?.(cleanTranscript);

      if (this.safeWord && this.checkMatch(cleanTranscript, this.safeWord)) {
        this.onStatusChange?.('detected', `Safe word "${this.safeWord}" detected! Triggering silent distress alert.`);
        this.onSafeWordDetected?.(this.safeWord, cleanTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      // Don't treat no-speech as fatal in continuous mode
      if (event.error === 'no-speech') return;
      console.warn('Speech recognition event error:', event.error);
      this.onStatusChange?.('error', `Microphone event: ${event.error}`);
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        // Auto-restart to maintain persistent covert background listening
        this.restartTimeout = setTimeout(() => {
          if (this.isRunning) {
            try {
              this.recognition.start();
            } catch (e) {
              // Ignore already started errors
            }
          }
        }, 1000);
      } else {
        this.onStatusChange?.('idle', 'Voice listening paused');
      }
    };
  }

  private checkMatch(transcript: string, targetWord: string): boolean {
    if (!transcript || !targetWord) return false;
    const normTranscript = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
    const normTarget = targetWord.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

    // Check direct substring
    if (normTranscript.includes(normTarget)) return true;

    // Check individual tokens
    const targetTokens = normTarget.split(/\s+/);
    if (targetTokens.length > 1) {
      const allFound = targetTokens.every(token => normTranscript.includes(token));
      if (allFound) return true;
    }

    return false;
  }

  public start(options: VoiceListenerOptions): boolean {
    this.safeWord = options.safeWord.trim();
    this.onSafeWordDetected = options.onSafeWordDetected;
    this.onTranscript = options.onTranscript;
    this.onStatusChange = options.onStatusChange;

    if (!this.recognition) {
      this.onStatusChange?.('unsupported', 'Web Speech API is not supported in this browser. You can use the Voice Test Simulator button.');
      return false;
    }

    this.isRunning = true;
    try {
      this.recognition.start();
      return true;
    } catch (err: any) {
      if (err.name !== 'InvalidStateError') {
        console.error('Failed to start speech recognition:', err);
        this.onStatusChange?.('error', err.message || 'Microphone access denied');
      }
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
    this.onStatusChange?.('idle', 'Voice detection disabled');
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Manual simulator for testing or demonstration
   */
  public simulateWordSpoken(spokenText: string): void {
    if (this.checkMatch(spokenText, this.safeWord)) {
      this.onStatusChange?.('detected', `Simulated safe word match: "${spokenText}"!`);
      this.onSafeWordDetected?.(this.safeWord, spokenText);
    } else {
      this.onTranscript?.(spokenText);
      this.onStatusChange?.('listening', `Heard: "${spokenText}" (Did not match configured safe word "${this.safeWord}")`);
    }
  }
}

export const globalVoiceDetector = new SafeWordVoiceDetector();
