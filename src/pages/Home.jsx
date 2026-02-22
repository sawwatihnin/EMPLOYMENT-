import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate("/interview")}
      style={{ 
        /* Occupy full viewport height and width */
        height: "100vh", 
        width: "100vw", 
        margin: 0,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        /* Full-screen background configuration */
        backgroundImage: 'url("/image.png")', 
        backgroundSize: "cover",      // Stretches to fill without whitespace
        backgroundPosition: "center", // Keeps the recruiter centered
        backgroundRepeat: "no-repeat",
        backgroundColor: "#000",      // Black fallback for a seamless look
        position: "fixed",            // Locks the background to the viewport
        top: 0,
        left: 0
      }}
    >
      {/* This transparent overlay ensures the entire screen 
          is a single clickable button to advance to the interview.
      */}
      <div style={{ position: "absolute", inset: 0 }}></div>
    </div>
  );
}