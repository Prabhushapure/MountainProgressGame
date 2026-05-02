import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import MountainProgressGame from './components/MountainProgressGame'
import { publicUrl } from './utils/publicUrl'

const CAMP1_VIDEO_SRC = publicUrl('assets/Fire Extinguisher.mp4')
const STORAGE_KEY = 'mountainProgressGameLevels'

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

function LearnVideoPage() {
  const navigate = useNavigate()

  const completeCamp1AndReturn = () => {
    const fallbackLevels = [
      { status: 'completed' },
      { status: 'active' },
      { status: 'locked' },
      { status: 'locked' },
    ]

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null
      if (Array.isArray(parsed) && parsed.length >= 4) {
        const next = parsed.map((level) => ({ ...level }))
        next[0] = { ...next[0], status: 'completed' }
        if (next[1]?.status === 'locked') {
          next[1] = { ...next[1], status: 'active' }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackLevels))
      }
    } catch (error) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackLevels))
    }

    navigate('/')
  }

  return (
    <div className="game-page">
      <h1>Learn Video</h1>
      <video
        src={CAMP1_VIDEO_SRC}
        style={{ width: 'min(960px, 92vw)', borderRadius: 12, marginTop: 12 }}
        autoPlay
        controls
        playsInline
        onEnded={completeCamp1AndReturn}
      >
        Your browser does not support the video tag.
      </video>
      <Link to="/" className="back-link">
        Back to Mountain Map
      </Link>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MountainProgressGame />} />
      <Route path="/learn-video" element={<LearnVideoPage />} />
      <Route path="/snake-ladder" element={<GamePage title="Snake & Ladder" />} />
      <Route path="/fire-shield" element={<GamePage title="Fire Shield" />} />
      <Route path="/evacuation" element={<GamePage title="Building Evacuation" />} />
    </Routes>
  )
}

export default App
