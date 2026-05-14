import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import FireShieldBrandHeader from './components/FireShieldBrandHeader'
import MountainProgressGame from './components/MountainProgressGame'
import { publicUrl } from './utils/publicUrl'

function GamePage({ title }) {
  return (
    <div className="game-page">
      <h1>{title}</h1>
      <p>This is the game route for {title}.</p>
      <Link to="/" className="back-link">
        Back to Mountain Map
      </Link>
    </div>
  )
}

function InstructionScreen({ onPlay }) {
  return (
    <div className="instruction-screen">
      <div className="instruction-frame">
        <FireShieldBrandHeader>
          <h1 className="instruction-title">
            <span>FIRE</span>SHIELD 360
          </h1>
          <p className="instruction-tagline">Gamified Fire Safety Training for Corporates &amp; Industry</p>
        </FireShieldBrandHeader>

        <div className="instruction-card">
          <h2 className="instruction-section-title">INSTRUCTIONS</h2>
          <p>
            Complete &amp; PASS all Activities to reach the Summit.
            <br />
            Completing the Activity at a Camp will unlock the next Camp.
            <br />
            Play Activities as many times as you wish at unlocked Camps.
            <br />
            You will reach the Summit on Passing Activities at all four Camps.
            <br />
            You can complete the journey across multiple sittings.
          </p>

          <h2 className="instruction-section-title">CAMP ACTIVITIES</h2>
          <ul className="instruction-list">
            <li>Camp 1: Learn about Fire Safety and the correct responses.</li>
            <li>Camp 2: Answer a Quiz on Fire Safety</li>
            <li>Camp 3: Learn to use the right Extinguisher for different Classes of Fire</li>
            <li>Camp 4: Learn the right procedure for Emergency Building Evacuation</li>
          </ul>
        </div>

        <button type="button" className="instruction-play-button" onClick={onPlay}>
          Play
        </button>
      </div>
    </div>
  )
}

function App() {
  const [isSplashDone, setIsSplashDone] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const location = useLocation()

  const shouldAutoStart = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (
      params.has('campOutcome') ||
      params.has('camp') ||
      params.has('returnToken') ||
      params.has('pass') ||
      params.has('result') ||
      params.has('status') ||
      params.has('play_result')
    )
  }, [location.search])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSplashDone(true)
    }, 4000)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [])

  if (!isSplashDone) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <FireShieldBrandHeader className="brand-header--splash">
            <h1 className="instruction-title">
              <span>FIRE</span>SHIELD 360
            </h1>
            <p className="instruction-tagline">Gamified Fire Safety Training for Corporates &amp; Industry</p>
          </FireShieldBrandHeader>
          <div className="splash-frame">
            <video
              className="splash-video"
              src={publicUrl('assets/video.mp4')}
              autoPlay
              muted
              playsInline
            />
          </div>
        </div>
      </div>
    )
  }

  if (!hasStarted && !shouldAutoStart) {
    return <InstructionScreen onPlay={() => setHasStarted(true)} />
  }

  return (
    <Routes>
      <Route path="/" element={<MountainProgressGame />} />
      <Route path="/snake-ladder" element={<GamePage title="Snake & Ladder" />} />
      <Route path="/fire-shield" element={<GamePage title="Fire Shield" />} />
      <Route path="/evacuation" element={<GamePage title="Building Evacuation" />} />
    </Routes>
  )
}

export default App
