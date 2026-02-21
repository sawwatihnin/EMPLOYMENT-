import { useEffect, useRef, useState } from 'react'

export function useHeartbeat() {
  const audioCtxRef = useRef(null)
  const [bpm, setBPM] = useState(60)
  const schedulerRef = useRef(null)

  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    return () => audioCtxRef.current?.close()
  }, [])

  useEffect(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return

    clearTimeout(schedulerRef.current)

    // Safety cap: max 140 BPM
    const safeBPM = Math.min(140, Math.max(30, bpm))
    const beatInterval = 60000 / safeBPM

    function playLubDub() {
      // "Lub" — lower frequency thump
      playTone(ctx, 80, 0.15, 0.9)
      // "Dub" — slightly higher, delayed
      setTimeout(() => playTone(ctx, 100, 0.1, 0.7), beatInterval * 0.35)
    }

    function schedule() {
      playLubDub()
      schedulerRef.current = setTimeout(schedule, beatInterval)
    }

    schedule()
    return () => clearTimeout(schedulerRef.current)
  }, [bpm])

  return { setBPM, bpm }
}

function playTone(ctx, freq, duration, gain) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)

  gainNode.gain.setValueAtTime(gain, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}