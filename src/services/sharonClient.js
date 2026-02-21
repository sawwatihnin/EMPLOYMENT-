// src/services/sharonClient.js

const MOCK_LINES = [
  "Tell me about yourself. And don't waste my time.",
  "You're avoiding the question. Answer it.",
  "Interesting. That pause was… loud.",
  "Look at me when you speak.",
  "Your confidence is slipping. I can hear it."
];

export async function getSharonLine({ stress = 0, eyeContact = 100 } = {}) {
  // ✅ STUB: no backend needed yet
  // Deterministic-ish response based on inputs so it feels reactive
  const idx = Math.floor((stress * 7 + (100 - eyeContact) * 3) % MOCK_LINES.length);
  const text = MOCK_LINES[idx];

  // Return shape that matches future backend response
  return {
    text,
    audioUrl: null // later: ElevenLabs mp3 url or base64
  };
}