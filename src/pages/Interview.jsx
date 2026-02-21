import useEyeTracking from "../hooks/useEyeTracking";
import useStressEngine from "../hooks/useStressEngine";
import useHeartbeat from "../hooks/useHeartbeat";

export default function Interview({ end }) {
  const eyeData = useEyeTracking();
  const stress = useStressEngine(eyeData);

  useHeartbeat(stress);

  return (
    <div className="interview-room">
      <h1>Final Round</h1>
      <p>Stress Level: {stress}</p>
      <button onClick={() => end({ stress })}>End Interview</button>
    </div>
  );
}