import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
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

function App() {
  const [isSplashDone, setIsSplashDone] = useState(false)

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
          <h1 className="splash-title">Fire Shield 360</h1>
          <div className="splash-frame">
            <video
              className="splash-video"
              src={publicUrl('assets/mp_.mp4')}
              autoPlay
              muted
              playsInline
            />
          </div>
        </div>
      </div>
    )
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
