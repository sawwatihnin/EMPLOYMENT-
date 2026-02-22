import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ElevenLabsClient } from "elevenlabs";

// ----------------------------
// Load Environment Variables
// ----------------------------
dotenv.config();

// Validate required env variables
if (!process.env.ELEVEN_API_KEY) {
  console.error("❌ ELEVEN_API_KEY is missing in .env");
  process.exit(1);
}

if (!process.env.ELEVEN_VOICE_ID) {
  console.error("❌ ELEVEN_VOICE_ID is missing in .env");
  process.exit(1);
}

// ----------------------------
// Initialize App
// ----------------------------
const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------
// Initialize ElevenLabs Client
// ----------------------------
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY,
});

// ----------------------------
// Health Check Route
// ----------------------------
app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

// ----------------------------
// Text-to-Speech Route
// ----------------------------
app.post("/api/tts", async (req, res) => {
  const { text, tier = "neutral" } = req.body;  // ← added tier

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      error: "Text is required and must be a string",
    });
  }

  // Voice personality shifts with stress tier
  const voiceSettings = {
    neutral:    { stability: 0.75, similarity_boost: 0.85, style: 0.10 },
    cold:       { stability: 0.85, similarity_boost: 0.80, style: 0.05 },
    aggressive: { stability: 0.40, similarity_boost: 0.90, style: 0.45 },
    horror:     { stability: 0.20, similarity_boost: 0.95, style: 0.80 },
  };

  try {
    const audioStream = await client.textToSpeech.convert(
      process.env.ELEVEN_VOICE_ID,
      {
        text: text.slice(0, 300),
        model_id: "eleven_turbo_v2_5",       // faster than monolingual_v1
        voice_settings: voiceSettings[tier] || voiceSettings.neutral,
        output_format: "mp3_44100_128",
      }
    );

    res.setHeader("Content-Type", "audio/mpeg");

    for await (const chunk of audioStream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
  console.error("FULL ELEVEN ERROR:", JSON.stringify(error, null, 2));
  console.error("MESSAGE:", error.message);
  console.error("STATUS:", error.statusCode || error.status);
  console.error("BODY:", error.body || error.response?.data);
  res.status(500).json({ 
    error: error.message,
    status: error.statusCode,
    body: error.body 
  });
}
});

// ----------------------------
// Start Server
// ----------------------------
const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`✅ AI Agent Backend running on http://localhost:${PORT}`);
});