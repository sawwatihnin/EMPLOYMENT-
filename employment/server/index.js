import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = process.env.ELEVEN_VOICE_ID; // e.g. Rachel, Bella, etc.

app.get("/health", (_, res) => res.json({ ok: true }));

// ------------------------
// Gemini "agent" endpoint
// ------------------------
app.post("/api/agent", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in .env" });
    }

    const {
      tier,
      stress,
      eyeContact,
      blinkRate,
      lastQuestion,
      lastAnswer,
      memory = [],
    } = req.body;

    // Keep prompts short + structured (easy to parse)
    const system = `
You are "Sharon White", a horror interview simulator character.
Return ONLY valid JSON. No markdown. No extra keys.

Rules:
- Tone depends on tier: neutral/cold/aggressive/horror.
- Always produce:
  sharon_line: string (what Sharon says)
  next_question: string (the next question)
  intent: one of ["followup","pressure","topic_shift","accuse","wrapup"]
  tier: one of ["neutral","cold","aggressive","horror"]
  tts_style: short string for voice direction (e.g. "calm", "cold", "snappy", "whisper")
  memory_update: short string to append to memory
`;

    const user = {
      tier,
      stress,
      eyeContact,
      blinkRate,
      lastQuestion,
      lastAnswer,
      memory,
    };

    // Gemini REST call (works without SDK)
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(GEMINI_API_KEY);

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: system }] },
          { role: "user", parts: [{ text: JSON.stringify(user) }] },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 220,
        },
      }),
    });

    const data = await resp.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    // Try parse JSON (Gemini sometimes adds whitespace/newlines)
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // fallback if it wrapped extra text
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } else {
        throw new Error("Could not parse Gemini JSON: " + text);
      }
    }

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ------------------------
// ElevenLabs TTS endpoint
// Returns MP3 audio bytes
// ------------------------
app.post("/api/tts", async (req, res) => {
  try {
    if (!ELEVEN_API_KEY) {
      return res.status(500).json({ error: "Missing ELEVEN_API_KEY in .env" });
    }
    if (!ELEVEN_VOICE_ID) {
      return res.status(500).json({ error: "Missing ELEVEN_VOICE_ID in .env" });
    }

    const { text, style = "neutral" } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`;

    const elevenResp = await fetch(elevenUrl, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.85,
          style: style === "horror" ? 0.9 : 0.4,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elevenResp.ok) {
      const errText = await elevenResp.text();
      return res.status(500).json({ error: errText });
    }

    const audioBuffer = Buffer.from(await elevenResp.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));