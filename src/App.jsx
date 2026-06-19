import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import FireShieldBrandHeader from './components/FireShieldBrandHeader'
import MountainProgressGame, { shouldSkipIntroScreens } from './components/MountainProgressGame'
import { getActiveTheme } from './themes'
import { publicUrl } from './utils/publicUrl'

function GamePage({ title }) {
  const theme = getActiveTheme()
  return (
    <div className="game-page">
      <h1>{title}</h1>
      <p>This is the game route for {title}.</p>
      <Link to="/" className="back-link">
        {`Back to ${theme.copy.goalLabel === 'Summit' ? 'Mountain Map' : 'Safety Map'}`}
      </Link>
    </div>
  )
}

function InstructionScreen({ theme, onPlay }) {
  const instructionLines = theme.copy.instructionIntro.split('\n')

  return (
    <div className="instruction-screen">
      <div className="instruction-frame">
        {theme.brand.useFireShieldHeader ? (
          <FireShieldBrandHeader>
            <h1 className="instruction-title">
              <span>{theme.brand.instructionTitleAccent}</span>
              {theme.brand.instructionTitleRest}
            </h1>
            <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
          </FireShieldBrandHeader>
        ) : (
          <div className="brand-header">
            <h1 className="instruction-title">
              <span>{theme.brand.instructionTitleAccent}</span>
              {theme.brand.instructionTitleRest}
            </h1>
            <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
          </div>
        )}

        <div className="instruction-card">
          <h2 className="instruction-section-title">INSTRUCTIONS</h2>
          <p>
            {instructionLines.map((line, index) => (
              <span key={line}>
                {line}
                {index < instructionLines.length - 1 ? (
                  <>
                    <br />
                  </>
                ) : null}
              </span>
            ))}
          </p>

          <h2 className="instruction-section-title">{`${theme.copy.stopLabel.toUpperCase()} ACTIVITIES`}</h2>
          <ul className="instruction-list">
            {theme.copy.instructionActivities.map((item) => (
              <li key={item}>{item}</li>
            ))}
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
  const theme = getActiveTheme()
  const location = useLocation()

  const skipIntro = useMemo(
    () => shouldSkipIntroScreens(new URLSearchParams(location.search)),
    [location.search],
  )

  const [isSplashDone, setIsSplashDone] = useState(skipIntro)
  const [hasStarted, setHasStarted] = useState(skipIntro)

  const shouldAutoStart = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (
      Boolean(params.get('token')?.trim()) ||
      params.has('campOutcome') ||
      params.has('camp') ||
      params.has('returnToken') ||
      params.has('pass') ||
      params.has('result') ||
      params.has('status') ||
      params.has('play_result')
    )
  }, [location.search])

  const finishSplash = useCallback(() => {
    setIsSplashDone(true)
  }, [])

  useEffect(() => {
    if (skipIntro) {
      setIsSplashDone(true)
      setHasStarted(true)
    }
  }, [skipIntro])

  useEffect(() => {
    if (skipIntro) return undefined

    const fallbackId = window.setTimeout(finishSplash, 12000)

    return () => {
      window.clearTimeout(fallbackId)
    }
  }, [skipIntro, finishSplash])

  if (!isSplashDone) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          {theme.brand.useFireShieldHeader ? (
            <FireShieldBrandHeader className="brand-header--splash">
              <h1 className="instruction-title">
                <span>{theme.brand.instructionTitleAccent}</span>
                {theme.brand.instructionTitleRest}
              </h1>
              <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
            </FireShieldBrandHeader>
          ) : (
            <div className="brand-header brand-header--splash">
              <h1 className="instruction-title">
                <span>{theme.brand.instructionTitleAccent}</span>
                {theme.brand.instructionTitleRest}
              </h1>
              <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
            </div>
          )}
          <div className="splash-frame">
            <video
              className="splash-video"
              src={`${publicUrl(theme.assets.splashVideo)}?v=2`}
              autoPlay
              muted
              playsInline
              onEnded={finishSplash}
              onError={finishSplash}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!hasStarted && !shouldAutoStart && !skipIntro) {
    return <InstructionScreen theme={theme} onPlay={() => setHasStarted(true)} />
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
