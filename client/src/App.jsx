import { useState } from 'react'
import InterviewRoom from './components/InterviewRoom'
import ResultsScreen from './components/ResultsScreen'
import { SessionProvider } from './context/SessionContext'

const SCENES = { DISCLAIMER: 'disclaimer', INTERVIEW: 'interview', RESULTS: 'results' }

export default function App() {
  const [scene, setScene] = useState(SCENES.DISCLAIMER)
  const [sessionData, setSessionData] = useState(null)

  return (
    <SessionProvider>
      {scene === SCENES.DISCLAIMER && (
        <DisclaimerScreen onAccept={() => setScene(SCENES.INTERVIEW)} />
      )}
      {scene === SCENES.INTERVIEW && (
        <InterviewRoom onEnd={(data) => { setSessionData(data); setScene(SCENES.RESULTS) }} />
      )}
      {scene === SCENES.RESULTS && (
        <ResultsScreen data={sessionData} onRestart={() => setScene(SCENES.DISCLAIMER)} />
      )}
    </SessionProvider>
  )
}