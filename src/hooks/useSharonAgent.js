// src/hooks/useSharonAgent.js
import { useCallback, useRef, useState } from "react";
import { getSharonLine } from "../services/sharonClient";

export function useSharonAgent() {
  const [line, setLine] = useState("");
  const audioRef = useRef(null);

  const speak = useCallback(async (ctx) => {
    const res = await getSharonLine(ctx);
    setLine(res.text);

    if (res.audioUrl) {
      // stop any previous audio
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(res.audioUrl);
      await audioRef.current.play();
    }
    return res.text;
  }, []);

  return { line, speak };
}