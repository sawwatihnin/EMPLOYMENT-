import { useState } from "react";
import RecruiterAvatar from "./components/RecruiterAvatar.jsx";

export default function App() {
  const [interviewerTalking, setInterviewerTalking] = useState(false);
  const [laserMode, setLaserMode] = useState(false);
  const [evilMode, setEvilMode] = useState(false);

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "black",
        color: "white",
      }}
    >
      <div style={{ position: "fixed", top: 12, left: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setInterviewerTalking((v) => !v)}>
            Toggle interviewerTalking (currently: {String(interviewerTalking)})
          </button>

          <button onClick={() => setLaserMode((v) => !v)}>
            Toggle laserMode (currently: {String(laserMode)})
          </button>

          <button onClick={() => setEvilMode((v) => !v)}>
            Toggle evilMode (currently: {String(evilMode)})
          </button>

          {evilMode ? (
            <div style={{ fontWeight: 700, color: "#ff4d4d" }}>
              😈 EVIL MODE ON
            </div>
          ) : null}
        </div>
      </div>

      {/* Optional: subtle red overlay so "laser/evil" is obvious */}
      {(laserMode || evilMode) ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: evilMode ? "rgba(255,0,0,0.18)" : "rgba(255,0,0,0.08)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <RecruiterAvatar
        isRecruiterTalking={interviewerTalking}
        laserMode={laserMode}
        evilMode={evilMode}
      />
    </div>
  );
}