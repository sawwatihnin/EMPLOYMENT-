import { Router } from 'express'
import { ElevenLabsClient } from 'elevenlabs'
import dotenv from 'dotenv'
dotenv.config()

const router = Router()
const client = new ElevenLabsClient({ apiKey: process.env.ELEVEN_API_KEY })

const VOICE_SETTINGS = {
  neutral:    { stability: 0.75, similarity_boost: 0.85, style: 0.10 },
  cold:       { stability: 0.85, similarity_boost: 0.80, style: 0.05 },
  aggressive: { stability: 0.40, similarity_boost: 0.90, style: 0.45 },
  horror:     { stability: 0.20, similarity_boost: 0.95, style: 0.80 },
}

router.post('/', async (req, res) => {
  const { text, tier = 'neutral' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  try {
    const stream = await client.textToSpeech.convert(
      process.env.ELEVEN_VOICE_ID,
      {
        text: text.slice(0, 300),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: VOICE_SETTINGS[tier] || VOICE_SETTINGS.neutral,
        output_format: 'mp3_44100_128',
      }
    )

    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const audio = Buffer.concat(chunks)

    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length })
    res.send(audio)
  } catch (err) {
    console.error('[TTS]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router