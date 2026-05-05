import { Link, Route, Routes } from 'react-router-dom'
import MountainProgressGame from './components/MountainProgressGame'

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
