import { fetchSharonSpeech, getSharonLine } from '../services/sharonClient'
import { useRef, useCallback, useState } from 'react'

// Hook for getting Sharon's text lines
export function useSharonAgent() {
  const [line, setLine] = useState("");

  const speak = useCallback(async ({ stress, eyeContact }) => {
    // Calls the service to get a mock line based on stress
    const res = await getSharonLine({ stress, eyeContact });
    setLine(res.text);
  }, []);

  return { line, speak };
}

// Hook for playing Sharon's voice via ElevenLabs
// Hook for playing Sharon's voice via browser TTS
export function useSharonVoice() {
  const [speaking, setSpeaking] = useState(false)

  const speak = useCallback((text, tier = 'neutral') => {
    if (!text) return
    setSpeaking(true)
    fetchSharonSpeech(text, tier)
    // estimate done based on text length
    const duration = (text.length / 15) * 1000
    setTimeout(() => setSpeaking(false), duration)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stopSpeaking, speaking }
}