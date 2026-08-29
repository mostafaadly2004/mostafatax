/**
 * Custom hook for Arabic Speech-to-Text using the Web Speech API
 * Built for Tax Support AI - Egyptian Real Estate Tax Authority
 * 
 * Features:
 * - Real-time Arabic (Egypt: ar-EG, fallback: ar-SA) transcription
 * - Appends to existing composer text without overwriting
 * - Tracks recording duration
 * - Full cleanup on unmount/stop
 * - Concurrency & double-click protection
 * - Safe error & permission handling
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  onTranscriptChange: (text: string) => void;
  getCurrentText: () => string;
}

export interface SpeechRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  durationSeconds: number;
  errorMessage: string | null;
  successMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearMessages: () => void;
}

// Extend Window interface for Web Speech API types
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useSpeechRecognition({
  onTranscriptChange,
  getCurrentText
}: UseSpeechRecognitionOptions): SpeechRecognitionState {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const isBusyRef = useRef<boolean>(false);
  const shouldRestartRef = useRef<boolean>(false);

  // Check if Web Speech API is supported
  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as IWindow).SpeechRecognition || (window as IWindow).webkitSpeechRecognition
  );

  // Helper to safely clean and merge text
  const mergeTranscripts = useCallback((baseText: string, sessionTranscript: string): string => {
    const trimmedBase = baseText.trimEnd();
    const trimmedSession = sessionTranscript.trim();

    if (!trimmedBase) return trimmedSession;
    if (!trimmedSession) return baseText;

    // Separate with a single space if needed
    const separator = /[\s\n]$/.test(baseText) ? '' : ' ';
    return `${trimmedBase}${separator}${trimmedSession}`;
  }, []);

  const clearMessages = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // Cleanup timers
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setDurationSeconds(0);
    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, [stopTimer]);

  // Clean stop recognition
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    stopTimer();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    }

    setIsListening(false);
    setIsProcessing(false);
    isBusyRef.current = false;
  }, [stopTimer]);

  // Start speech recognition
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage('الإملاء الصوتي غير مدعوم على هذا المتصفح. يمكنك كتابة استفسارك مباشرة.');
      return;
    }

    if (isBusyRef.current || isListening) {
      return;
    }

    isBusyRef.current = true;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    // Save baseline text already typed in the composer
    baseTextRef.current = getCurrentText();
    finalTranscriptRef.current = '';

    try {
      const SpeechRecognitionConstructor = 
        (window as IWindow).SpeechRecognition || (window as IWindow).webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        throw new Error('Speech recognition not available');
      }

      // Cleanup any stale instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognitionRef.current = recognition;

      // Prefer Egyptian Arabic for Egyptian Tax Authority
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsProcessing(false);
        isBusyRef.current = false;
        startTimer();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinals = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinals += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (currentFinals) {
          finalTranscriptRef.current += currentFinals;
        }

        const combinedSessionTranscript = (finalTranscriptRef.current + interimTranscript).trim();
        const mergedText = mergeTranscripts(baseTextRef.current, combinedSessionTranscript);
        onTranscriptChange(mergedText);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        console.warn('[SpeechRecognition] error:', error);

        if (error === 'not-allowed' || error === 'permission-denied') {
          setErrorMessage('يرجى السماح للمتصفح باستخدام الميكروفون لتفعيل ميزة الإملاء الصوتي.');
        } else if (error === 'no-speech') {
          // Subtle ignore on brief silence
        } else if (error === 'network') {
          setErrorMessage('تعذر الاتصال بخدمة التعرف على الصوت. يرجى التحقق من اتصال الإنترنت.');
        } else if (error !== 'aborted') {
          setErrorMessage('تعذر تحويل الصوت إلى نص، يرجى المحاولة مرة أخرى أو كتابة السؤال.');
        }

        stopListening();
      };

      recognition.onend = () => {
        if (shouldRestartRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            shouldRestartRef.current = false;
          }
        }

        setIsListening(false);
        setIsProcessing(false);
        isBusyRef.current = false;
        stopTimer();

        if (finalTranscriptRef.current.trim()) {
          setSuccessMessage('تم تحويل الصوت إلى نص بنجاح. يمكنك مراجعته وتعديله قبل الإرسال.');
          setTimeout(() => {
            setSuccessMessage(null);
          }, 3500);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn('[SpeechRecognition] start error:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
        setErrorMessage('يرجى السماح للمتصفح بالوصول إلى الميكروفون لاستخدام الإملاء الصوتي.');
      } else {
        setErrorMessage('تعذر بدء التسجيل الصوتي. يمكنك كتابة استفسارك بشكل طبيعي.');
      }
      setIsListening(false);
      setIsProcessing(false);
      isBusyRef.current = false;
      stopTimer();
    }
  }, [isSupported, isListening, getCurrentText, mergeTranscripts, onTranscriptChange, startTimer, stopListening, stopTimer]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up completely on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      stopTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [stopTimer]);

  return {
    isSupported,
    isListening,
    isProcessing,
    durationSeconds,
    errorMessage,
    successMessage,
    startListening,
    stopListening,
    toggleListening,
    clearMessages
  };
}
