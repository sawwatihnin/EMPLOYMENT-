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

    console.log("stress: " + stress);
    let newHeartVal = 1;
    /*Math.floor(stress/10) + 4;
    if(newHeartVal > 9){
      newHeartVal = 9;
    }else if(newHeartVal < 1){
      newHeartVal = 1;
    }
    console.log("before caps: " + newHeartVal);
    newHeartVal = newHeartVal * (-1) + 10;*/

    if(stress < 10){
      newHeartVal = 9;
    }else if(stress < 20){
      newHeartVal = 8;
    }else if(stress < 30){
      newHeartVal = 7
    }else if(stress < 40){
      newHeartVal = 6
    }else if(stress < 50){
      newHeartVal = 5
    }else if(stress < 60){
      newHeartVal = 4
    }else if(stress < 70){
      newHeartVal = 3
    }else if(stress < 80){
      newHeartVal = 2;
    }else if(stress < 90){
      newHeartVal = 1
    }else{
      newHeartVal = 1
    }
    
    fetch('http://localhost:3000/' + newHeartVal);

  // Return shape that matches future backend response
  return {
    text,
    audioUrl: null // later: ElevenLabs mp3 url or base64
  };
}
