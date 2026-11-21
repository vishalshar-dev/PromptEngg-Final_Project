import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export interface UseVoiceInputOptions {
  lang?: string;
  onFinalTranscript: (transcript: string) => void;
}

export function useVoiceInput({
  lang = 'en-IN',
  onFinalTranscript,
}: UseVoiceInputOptions) {
  const [isSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionCtor()));
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    setVoiceError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError(
        'Voice input works in Chrome, Edge, or Safari with microphone access enabled.'
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        setVoiceError(null);
      };

      rec.onresult = (event) => {
        let interim = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result?.[0]?.transcript ?? '';
          if (!text) continue;
          if (result.isFinal) {
            finalText += (finalText ? ' ' : '') + text.trim();
          } else {
            interim += (interim ? ' ' : '') + text.trim();
          }
        }

        setInterimTranscript(interim);
        if (finalText.trim()) {
          onFinalRef.current(finalText.trim());
        }
      };

      rec.onerror = (event) => {
        const code = event?.error ?? '';
        if (code === 'aborted') {
          setIsListening(false);
          setInterimTranscript('');
          return;
        }
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setVoiceError(
            'Microphone permission was denied. Allow mic access in browser settings to speak to Penny.'
          );
        } else if (code === 'no-speech') {
          setVoiceError('No speech detected. Tap the mic and speak clearly.');
        } else if (code === 'audio-capture') {
          setVoiceError('No microphone device was detected.');
        } else if (code === 'network') {
          setVoiceError('Voice recognition service could not connect right now. Try typing or speaking again.');
        } else {
          setVoiceError('Could not capture voice right now. Please try typing or speaking again.');
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        if (recognitionRef.current === rec) {
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
      setVoiceError('Could not start voice dictation in this browser context.');
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    voiceError,
    startListening,
    stopListening,
    toggleListening,
    clearVoiceError,
  };
}
