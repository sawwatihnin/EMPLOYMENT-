// ADD to your existing useSharonAgent.js

import { fetchSharonSpeech } from '../services/sharonClient'
import { useRef, useCallback, useState } from 'react'

export function useSharonVoice() {
  const audioCtxRef = useRef(null)
  const sourceRef   = useRef(null)
  const [speaking, setSpeaking] = useState(false)

  function getCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const speak = useCallback(async (text, tier = 'neutral') => {
    if (!text || speaking) return
    try {
      setSpeaking(true)
      sourceRef.current?.stop()

      const arrayBuffer = await fetchSharonSpeech(text, tier)
      const ctx = getCtx()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => setSpeaking(false)
      sourceRef.current = source
      source.start()
    } catch (err) {
      console.error('[Sharon Voice]', err.message)
      setSpeaking(false)
    }
  }, [speaking])

  const stopSpeaking = useCallback(() => {
    sourceRef.current?.stop()
    setSpeaking(false)
  }, [])

  return { speak, stopSpeaking, speaking }
}