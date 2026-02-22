import express from "express";
import cors from "cors";
import dotenv from "dotenv"; // Import this to read your .env file
import { ElevenLabsClient } from "elevenlabs";

// 1. Load the variables from your .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. Use the exact names from your screenshot
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY, 
});

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  try {
    const audio = await client.generate({
      // Use the Voice ID from your .env
      voice: process.env.ELEVEN_VOICE_ID, 
      text: text,
      model_id: "eleven_monolingual_v1",
    });

    res.set({ "Content-Type": "audio/mpeg" });
    audio.pipe(res);
  } catch (error) {
    console.error("ElevenLabs Error:", error);
    res.status(500).send("Error generating speech");
  }
});

// Use the port from your .env
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`✅ AI Agent Backend running on http://localhost:${PORT}`);
});