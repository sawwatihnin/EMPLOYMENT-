import { useEffect, useRef } from 'react'
import { useEyeTracking } from '../hooks/useEyeTracking'
import { useStressEngine } from '../hooks/useStressEngine'
import { useHeartbeat } from '../hooks/useHeartbeat'
import { useArduinoHaptics } from '../hooks/useArduinoHaptics'

export default function InterviewRoom({ onEnd }) {
  const videoRef = useRef(null)
  const { gazeScore, blinkRate } = useEyeTracking(videoRef)
  const { stress, tier } = useStressEngine({ gazeScore, blinkRate })
  const { setBPM } = useHeartbeat()
  const { sendVibration } = useArduinoHaptics()

  useEffect(() => {
    // Map stress 0–100 → BPM 50–140
    const bpm = 50 + (stress / 100) * 90
    setBPM(bpm)

    // Map stress → vibration intensity 0–200 (safety cap)
    const intensity = Math.floor((stress / 100) * 200)
    sendVibration(intensity)
  }, [stress])

  return (
    <div className={`interview-room tier-${tier}`}>
      <RecruiterAvatar tier={tier} />
      <video ref={videoRef} autoPlay muted className="webcam-feed" />
      <StressMeter value={stress} tier={tier} />
      <QuestionPanel tier={tier} />
      <HeartbeatOverlay stress={stress} />
      <PanicButton onExit={() => onEnd({ stress, blinkRate })} />
    </div>
  )
}