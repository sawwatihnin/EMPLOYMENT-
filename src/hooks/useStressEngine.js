import { useState, useEffect } from "react";

export default function useStressEngine(eyeData) {
  const [stress, setStress] = useState(10);

  useEffect(() => {
    if (!eyeData) return;

    let newStress = stress;

    if (!eyeData.isLookingCenter) {
      newStress += 2;
    }

    if (eyeData.blinkRate > 25) {
      newStress += 3;
    }

    newStress = Math.max(0, Math.min(100, newStress));
    setStress(newStress);

  }, [eyeData]);

  return stress;
}