import { useState, useEffect, useCallback } from 'react';
import {
  startAudioCapture,
  stopAudioCapture,
  getAnalyserNode,
  isCapturing,
} from '@/audio/audioManager';

export function useAudio() {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const start = useCallback(async () => {
    try {
      await startAudioCapture()
      setCapturing(true)
      setAnalyser(getAnalyserNode())
      setError(null)
    } catch (err) {
      // Try requesting permission via background script
      chrome.runtime.sendMessage({ type: 'REQUEST_MIC_PERMISSION' })
      // Listen for permission granted then retry
      const handler = (msg: { type: string }) => {
        if (msg.type === 'MIC_PERMISSION_GRANTED') {
          chrome.runtime.onMessage.removeListener(handler)
          startAudioCapture().then(() => {
            setCapturing(true)
            setAnalyser(getAnalyserNode())
            setError(null)
          }).catch(() => {
            setError('Microphone access denied.')
            setCapturing(false)
          })
        }
        if (msg.type === 'MIC_PERMISSION_DENIED') {
          chrome.runtime.onMessage.removeListener(handler)
          setError('Microphone access denied. Please allow it in Chrome settings.')
          setCapturing(false)
        }
      }
      chrome.runtime.onMessage.addListener(handler)
    }
  }, []);

  const stop = useCallback(() => {
    stopAudioCapture();
    setCapturing(false);
    setAnalyser(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturing()) stopAudioCapture();
    };
  }, []);

  return { capturing, start, stop, analyser, error };
}
