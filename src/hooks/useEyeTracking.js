import { useEffect, useState } from "react";

export default function useEyeTracking() {
  const [eyeData, setEyeData] = useState(null);

  useEffect(() => {
    // Placeholder until MediaPipe integration
    const interval = setInterval(() => {
      setEyeData({
        isLookingCenter: Math.random() > 0.3,
        blinkRate: 15 + Math.random() * 20
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return eyeData;
}