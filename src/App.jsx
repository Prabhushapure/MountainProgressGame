import {
  createSearchParams,
  Link,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import MountainProgressGame from './components/MountainProgressGame'
import { publicUrl } from './utils/publicUrl'

const CAMP1_VIDEO_SRC = publicUrl('assets/Fire Extinguisher.mp4')

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
    navigate({
      pathname: '/',
      search: createSearchParams({
        campOutcome: '1',
        status: 'Pass',
        play_result: 'Pass',
      }).toString(),
    })
  }

  return (
    <div className="game-page game-page--learn-video">
      <h1 className="learn-video-heading">Camp 1 — Learn Video</h1>
      <p className="learn-video-subtitle">
        Watch inside the frame below. Finish the video to return to the map.
      </p>
      <div
        className="learn-video-frame"
        onContextMenu={(e) => e.preventDefault()}
        role="presentation"
      >
        <div className="learn-video-frame__bezel" aria-hidden="true" />
        <div className="learn-video-frame__inner">
          <video
            className="learn-video-player"
            src={CAMP1_VIDEO_SRC}
            autoPlay
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            playsInline
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onEnded={completeCamp1AndReturn}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
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
