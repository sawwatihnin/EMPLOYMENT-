import { useEffect, useState } from "react";
import { useSharonAgent } from "../hooks/useSharonAgent";
import RecruiterAvatar from "../components/RecruiterAvatar.jsx";

export default function Interview() {
  const { line, speak } = useSharonAgent();
  const [stress, setStress] = useState(10);
  const [eyeContact, setEyeContact] = useState(92);

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [userTalking, setUserTalking] = useState(false);

  useEffect(() => {
    const onMsg = (e) => {
      const type = e?.data?.type;
      if (type === "EMPLOYMENT_INTERVIEW_STARTED") setInterviewStarted(true);
      if (type === "EMPLOYMENT_INTERVIEW_ENDED") setInterviewStarted(false);
    };

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // NEW: Spacebar listeners (hold-to-talk)
  useEffect(() => {
    const isTypingElement = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const onKeyDown = (e) => {
      if (e.code !== "Space") return;
      if (e.repeat) return;
      if (isTypingElement(document.activeElement)) return;

      e.preventDefault(); // stops page scroll
      setUserTalking(true);
    };

    const onKeyUp = (e) => {
      if (e.code !== "Space") return;
      if (isTypingElement(document.activeElement)) return;

      e.preventDefault();
      setUserTalking(false);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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

  // Recruiter talks when user is NOT talking
  const recruiterTalking = interviewStarted && !userTalking;


  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <iframe
          src="/employment.html"
          title="Employment Simulation"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
  
        {/* 3D recruiter overlay (responsive) */}
        {interviewStarted && (
          <div
            style={{
              position: "absolute",
              /* anchor relative to the iframe viewport */
              left: "19%",     // tweak
              top: "-11%",      // tweak
              width: "40%",    // tweak
              aspectRatio: "280 / 380", // keeps “portrait” shape
              zIndex: 9000,
              pointerEvents: "none",
              overflow: "hidden", 
              borderRadius: 12,
            }}
          >
            <RecruiterAvatar
              isRecruiterTalking={recruiterTalking}
              evilMode={stress > 70}
            />
          </div>
        )}
  
        {/* Overlay panel */}
        <div
          style={{
            position: "absolute",
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
            backdropFilter: "blur(6px)",
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
    </div>
  );
}