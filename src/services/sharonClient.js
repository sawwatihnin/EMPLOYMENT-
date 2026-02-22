// src/services/sharonClient.js

const MOCK_LINES = [
  "Tell me about yourself. And don't waste my time.",
  "You're avoiding the question. Answer it.",
  "Interesting. That pause was… loud.",
  "Look at me when you speak.",
  "Your confidence is slipping. I can hear it."
];

const API_BASE = 'http://localhost:8787';

/**
 * Browser-native TTS — no API key needed
 */
export function fetchSharonSpeech(text, tier = 'neutral') {
  const synth = window.speechSynthesis
  synth.cancel()

  const utter = new SpeechSynthesisUtterance(text)

  const voices = synth.getVoices()
  const female = voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Karen') ||
    v.name.includes('Female') ||
    (v.lang === 'en-US' && v.name.includes('Google'))
  )
  if (female) utter.voice = female

  utter.rate   = tier === 'aggressive' ? 1.3 : tier === 'horror' ? 0.8 : 1.0
  utter.pitch  = tier === 'horror' ? 0.4 : tier === 'cold' ? 0.8 : 1.0
  utter.volume = 1.0

  synth.speak(utter)
}

export async function getSharonLine({ stress = 0, eyeContact = 100 } = {}) {
  const idx = Math.floor((stress * 7 + (100 - eyeContact) * 3) % MOCK_LINES.length);
  const text = MOCK_LINES[idx];

  let newHeartVal = 1;
  if(stress < 10) newHeartVal = 9;
  else if(stress < 20) newHeartVal = 8;
  else if(stress < 30) newHeartVal = 7;
  else if(stress < 40) newHeartVal = 6;
  else if(stress < 50) newHeartVal = 5;
  else if(stress < 60) newHeartVal = 4;
  else if(stress < 70) newHeartVal = 3;
  else if(stress < 80) newHeartVal = 2;
  else newHeartVal = 1;
    
  // Wrapped in try/catch so voice still works if Port 3000 is down
  try {
    fetch('http://localhost:3000/' + newHeartVal, { mode: 'no-cors' });
  } catch (e) {
    console.warn("Hardware server offline.");
  }

  return { text, audioUrl: null };
}