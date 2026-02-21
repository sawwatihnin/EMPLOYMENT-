import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "40vh" }}>
      <h1>Interview Simulator</h1>
      <button onClick={() => navigate("/interview")}>
        Start Interview
      </button>
    </div>
  );
}