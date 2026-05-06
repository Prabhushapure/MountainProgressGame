import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

/** Old persisted progress — cleared once so it no longer drives the map. */
const LEGACY_LEVELS_STORAGE_KEY = 'mountainProgressGameLevels'
/** In-tab only; cleared when the tab closes (“fresh” next visit). */
const SESSION_LEVELS_KEY = 'mountainProgressSessionLevels'
const EXTERNAL_RETURN_TOKEN_KEY = 'mountainProgressExternalReturnToken'

const loadSessionLevels = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_LEVELS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length !== defaultLevels.length) return null
    return defaultLevels.map((def, i) => ({
      ...def,
      status: parsed[i]?.status ?? def.status,
    }))
  } catch {
    return null
  }
}

const applyCampPassOutcome = (prevLevels, campId, passed) => {
  const idx = prevLevels.findIndex((l) => l.id === campId)
  if (idx === -1) return prevLevels
  if (prevLevels[idx].status !== 'active') return prevLevels
  if (!passed) return prevLevels

  const next = prevLevels.map((l) => ({ ...l }))
  next[idx].status = 'completed'
  if (idx + 1 < next.length) {
    next[idx + 1].status = 'active'
  }
  return next
}

/** Maps return URL params (e.g. antiz `status=Pass`, `play_result=Pass`) to pass/fail. */
const parseOutcomeToken = (raw) => {
  if (raw == null || raw === '') return null
  const n = String(raw).trim().toLowerCase()
  if (['true', '1', 'pass', 'passed', 'success'].includes(n)) return true
  if (['false', '0', 'fail', 'failed', 'failure'].includes(n)) return false
  return null
}

const RETURN_OUTCOME_PARAM_KEYS = ['pass', 'result', 'status', 'play_result']

/**
 * If any known outcome param is present and parses, returns explicit result.
 * Mixed pass+fail → fail (do not advance).
 */
const getExplicitReturnPassState = (params) => {
  const parsed = RETURN_OUTCOME_PARAM_KEYS.map((key) =>
    parseOutcomeToken(params.get(key)),
  ).filter((x) => x !== null)

  if (parsed.length === 0) return { explicit: false, passed: false }

  const passed = parsed.every(Boolean)
  return { explicit: true, passed }
}
const CAMP2_EXTERNAL_URL =
  'https://antiz-digital.com/snake/?topic=Fire%20Safety'
const CAMP3_EXTERNAL_URL = 'https://antiz-digital.com/fire-shield/'
const CAMP4_EXTERNAL_URL = 'https://antiz-digital.com/building-evacuation/'
const CAMP1_EXTERNAL_URL = 'https://antiz-digital.com/fire-safety-learn/'

const positions = [
  { top: '100%', left: '31%' },
  { top: '88%', left: '48%' },
  { top: '66%', left: '52%' },
  { top: '42%', left: '56%' },
]

const summitPosition = { top: '10%', left: '62%' }
const MAP_SCALE_X = 0.95
const MAP_SCALE_Y = 0.95

const remapPointToMountain = (point) => {
  const left = parseFloat(point.left)
  const top = parseFloat(point.top)

  return {
    left: `${50 + (left - 50) * MAP_SCALE_X}%`,
    top: `${top * MAP_SCALE_Y}%`,
  }
}

const defaultLevels = [
  { id: 1, title: 'Camp 1', status: 'active', url: CAMP1_EXTERNAL_URL },
  { id: 2, title: 'Camp 2', status: 'locked', url: CAMP2_EXTERNAL_URL },
  { id: 3, title: 'Camp 3', status: 'locked', url: CAMP3_EXTERNAL_URL },
  { id: 4, title: 'Camp 4', status: 'locked', url: CAMP4_EXTERNAL_URL },
]

const campSubtitleById = {
  1: 'Learn Video',
  2: 'Snake & Ladder',
  3: 'Fire Shield',
  4: 'Building Evacuation',
}

const tentImageByStatus = {
  active: publicUrl('assets/tent-yellow.png'),
  locked: publicUrl('assets/tent-red.png'),
  completed: publicUrl('assets/tent-green.png'),
}

function MountainProgressGame() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [levels, setLevels] = useState(() => {
    const fromSession = loadSessionLevels()
    if (fromSession) return fromSession
    return defaultLevels.map((level) => ({ ...level }))
  })

  useEffect(() => {
    localStorage.removeItem(LEGACY_LEVELS_STORAGE_KEY)
  }, [])

  useEffect(() => {
    sessionStorage.setItem(
      SESSION_LEVELS_KEY,
      JSON.stringify(levels.map((l) => ({ status: l.status }))),
    )
  }, [levels])

  useEffect(() => {
    const campIdRaw = searchParams.get('campOutcome') ?? searchParams.get('camp')

    if (!campIdRaw) return

    const campId = Number(campIdRaw)
    if (Number.isNaN(campId)) return
    const returnToken = searchParams.get('returnToken')
    const expectedReturnToken = sessionStorage.getItem(EXTERNAL_RETURN_TOKEN_KEY)

    const { explicit, passed } = getExplicitReturnPassState(searchParams)

    if (explicit) {
      setLevels((prev) => applyCampPassOutcome(prev, campId, passed))
      setSearchParams({}, { replace: true })
      return
    }

    // Camp 1 is a learn-video step; returning from it implies completion.
    if (campId === 1 && returnToken && expectedReturnToken === returnToken) {
      setLevels((prev) => applyCampPassOutcome(prev, campId, true))
      sessionStorage.removeItem(EXTERNAL_RETURN_TOKEN_KEY)
      setSearchParams({}, { replace: true })
      return
    }

    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const mappedPositions = useMemo(
    () => positions.map(remapPointToMountain),
    [],
  )
  const mappedSummitPosition = useMemo(
    () => remapPointToMountain(summitPosition),
    [],
  )

  const handleTentClick = (level) => {
    if (level.status === 'locked') return
    if (/^https?:\/\//.test(level.url)) {
      const gameUrl = new URL(level.url)
      const returnBase = new URL(
        import.meta.env.BASE_URL || '/',
        window.location.origin,
      )
      const returnUrl = new URL(returnBase.href)
      const returnToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(EXTERNAL_RETURN_TOKEN_KEY, returnToken)
      returnUrl.search = ''
      returnUrl.searchParams.set('campOutcome', String(level.id))
      returnUrl.searchParams.set('returnToken', returnToken)
      gameUrl.searchParams.set('returnUrl', returnUrl.href)
      window.location.assign(gameUrl.href)
      return
    }
    navigate(level.url)
  }

  return (
    <div
      className="mountain-map"
      style={{
        backgroundImage: `url(${publicUrl('assets/mountain.png')})`,
      }}
    >
      <div className="hud-title">
        <h2>FIRE SHIELD 360</h2>
        <p>Fire Safety & Immediate Response</p>
      </div>

      {/* 🎯 TENTS */}
      {levels.map((level, index) => (
        <div
          key={level.id}
          className="tent-node"
          style={{
            top: mappedPositions[index].top,
            left: mappedPositions[index].left,
          }}
        >
          <button
            type="button"
            className={`tent-button status-${level.status}`}
            onClick={() => handleTentClick(level)}
            disabled={level.status === 'locked'}
          >
            <img
              src={tentImageByStatus[level.status]}
              alt={level.title}
              className={`tent-image ${level.id === 1 ? 'tent-image-camp-1' : ''}`}
            />
          </button>

          <div className={`camp-label status-${level.status}`}>
            <span className="camp-label-title">{level.title}</span>
            <span className="camp-label-subtitle">
              {campSubtitleById[level.id] ?? 'Training Module'}
            </span>
          </div>
        </div>
      ))}

      {/* 🏁 SUMMIT */}
      <div
        className="summit-node"
        style={{
          top: mappedSummitPosition.top,
          left: mappedSummitPosition.left,
        }}
      >
        <span className="summit-flag">🏁</span>
        <span className="summit-text">Summit</span>
      </div>
    </div>
  )
}

export default MountainProgressGame