import { useEffect, useRef } from "react";

export default function useHeartbeat(stress) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/heartbeat.wav");
      audioRef.current.loop = true;
      audioRef.current.play();
    }

    const bpm = 60 + stress * 0.8;
    audioRef.current.playbackRate = bpm / 60;

  }, [stress]);
}