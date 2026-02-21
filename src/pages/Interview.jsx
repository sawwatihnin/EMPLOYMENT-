import { useEffect, useState } from "react";
import { useSharonAgent } from "../hooks/useSharonAgent";

export default function Interview() {
  const { line, speak } = useSharonAgent();
  const [stress, setStress] = useState(10);
  const [eyeContact, setEyeContact] = useState(92);

  // Demo: call agent every 10s (replace later with real stress events)
  useEffect(() => {
    const t = setInterval(() => {
      setStress((s) => Math.min(100, s + 7));
      setEyeContact((e) => Math.max(0, e - 3));
    }, 3000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Speak on meaningful change, not every render
    speak({ stress, eyeContact });
  }, [stress, eyeContact, speak]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <iframe
        src="/employment.html"
        title="Employment Simulation"
        style={{ width: "100%", height: "100%", border: "none" }}
      />

      {/* Overlay panel (won't touch Claude file) */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 9999,
          padding: 12,
          width: 320,
          background: "rgba(0,0,0,0.65)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 12,
          backdropFilter: "blur(6px)"
        }}
      >
        <div style={{ opacity: 0.7, marginBottom: 6 }}>SHARON AGENT (stub)</div>
        <div>stress: {stress}</div>
        <div>eyeContact: {eyeContact}%</div>
        <div style={{ marginTop: 8, color: "#ff6644" }}>{line}</div>

        <button
          onClick={() => speak({ stress, eyeContact })}
          style={{
            marginTop: 10,
            padding: "6px 10px",
            background: "transparent",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer"
          }}
        >
          Force line
        </button>
      </div>
    </div>
  );
}