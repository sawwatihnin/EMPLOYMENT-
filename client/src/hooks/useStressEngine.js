import { useState, useEffect, useRef } from 'react'
import { calculateStressDelta, clampStress } from '../engine/StressEngine'
import { getTier } from '../engine/tiers'

export function useStressEngine({ gazeScore, blinkRate }) {
  const [stress, setStress] = useState(0)
  const stressRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = calculateStressDelta(gazeScore, blinkRate)
      const next = clampStress(stressRef.current, delta)
      stressRef.current = next
      setStress(next)
    }, 200) // tick every 200ms

    return () => clearInterval(interval)
  }, [gazeScore, blinkRate])

  return { stress, tier: getTier(stress).name }
}