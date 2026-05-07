import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

/** Old persisted progress — cleared once so it no longer drives the map. */
const LEGACY_LEVELS_STORAGE_KEY = 'mountainProgressGameLevels'
const TOKEN_PROGRESS_STORAGE_KEY = 'mountainProgressByToken'
const EXTERNAL_RETURN_TOKEN_KEY = 'mountainProgressExternalReturnToken'
const ANON_SESSION_LEVELS_KEY = 'mountainProgressAnonSessionLevels'
const ANON_PROGRESS_TOKEN = '__default__'

const getTokenFromParams = (params) => {
  const token = params.get('token')?.trim()
  return token || null
}

const getDefaultLevels = () => defaultLevels.map((level) => ({ ...level }))

const loadProgressStore = () => {
  try {
    const raw = localStorage.getItem(TOKEN_PROGRESS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

const loadLevelsByProgressToken = (progressToken) => {
  const store = loadProgressStore()
  const tokenData = store[progressToken]
  const statuses = tokenData?.levels

  if (!Array.isArray(statuses) || statuses.length !== defaultLevels.length) {
    return getDefaultLevels()
  }

  return defaultLevels.map((def, i) => ({
    ...def,
    status: statuses[i]?.status ?? def.status,
  }))
}

const loadAnonSessionLevels = () => {
  try {
    const raw = sessionStorage.getItem(ANON_SESSION_LEVELS_KEY)
    if (!raw) return getDefaultLevels()
    const statuses = JSON.parse(raw)
    if (!Array.isArray(statuses) || statuses.length !== defaultLevels.length) {
      return getDefaultLevels()
    }
    return defaultLevels.map((def, i) => ({
      ...def,
      status: statuses[i]?.status ?? def.status,
    }))
  } catch {
    return getDefaultLevels()
  }
}

const saveLevelsByProgressToken = (progressToken, levels) => {
  const store = loadProgressStore()
  const allCompleted = levels.every((level) => level.status === 'completed')
  if (allCompleted) {
    delete store[progressToken]
  } else {
    store[progressToken] = {
      levels: levels.map((l) => ({ status: l.status })),
      updatedAt: new Date().toISOString(),
    }
  }
  localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
}

const saveAnonSessionLevels = (levels) => {
  sessionStorage.setItem(
    ANON_SESSION_LEVELS_KEY,
    JSON.stringify(levels.map((l) => ({ status: l.status }))),
  )
}

const applyOutcomeForContext = (progressToken, hasTokenInUrl, campId, passed) => {
  const current = hasTokenInUrl
    ? loadLevelsByProgressToken(progressToken)
    : loadAnonSessionLevels()
  const next = applyCampPassOutcome(current, campId, passed)
  if (hasTokenInUrl) {
    saveLevelsByProgressToken(progressToken, next)
  } else {
    saveAnonSessionLevels(next)
  }
  return next
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

const getCleanSearchParams = (params) => {
  const next = new URLSearchParams(params)
  ;[
    'campOutcome',
    'camp',
    'returnToken',
    ...RETURN_OUTCOME_PARAM_KEYS,
  ].forEach((key) => next.delete(key))
  return next
}

const createReturnToken = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const queueLevelsUpdate = (setter, updater) => {
  Promise.resolve().then(() => {
    setter(updater)
  })
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
  const [isResultOpen, setIsResultOpen] = useState(false)
  const tokenFromUrl = useMemo(() => getTokenFromParams(searchParams), [searchParams])
  const hasTokenInUrl = Boolean(tokenFromUrl)
  const progressToken = tokenFromUrl || ANON_PROGRESS_TOKEN

  const [levels, setLevels] = useState(() =>
    hasTokenInUrl ? loadLevelsByProgressToken(progressToken) : loadAnonSessionLevels(),
  )

  useEffect(() => {
    localStorage.removeItem(LEGACY_LEVELS_STORAGE_KEY)
    const store = loadProgressStore()
    if (store[ANON_PROGRESS_TOKEN]) {
      delete store[ANON_PROGRESS_TOKEN]
      localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
    }
  }, [])

  useEffect(() => {
    const nextLevels = hasTokenInUrl
      ? loadLevelsByProgressToken(progressToken)
      : loadAnonSessionLevels()
    queueLevelsUpdate(setLevels, nextLevels)
  }, [hasTokenInUrl, progressToken])

  useEffect(() => {
    if (hasTokenInUrl) {
      saveLevelsByProgressToken(progressToken, levels)
    } else {
      saveAnonSessionLevels(levels)
    }
  }, [hasTokenInUrl, levels, progressToken])

  useEffect(() => {
    const campIdRaw = searchParams.get('campOutcome') ?? searchParams.get('camp')

    if (!campIdRaw) return

    const campId = Number(campIdRaw)
    if (Number.isNaN(campId)) return
    const returnToken = searchParams.get('returnToken')
    const expectedReturnToken = sessionStorage.getItem(EXTERNAL_RETURN_TOKEN_KEY)

    const { explicit, passed } = getExplicitReturnPassState(searchParams)

    if (explicit) {
      const nextLevels = applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        passed,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setSearchParams(getCleanSearchParams(searchParams), { replace: true })
      return
    }

    // Camp 1 is a learn-video step; returning from it implies completion.
    if (campId === 1 && returnToken && expectedReturnToken === returnToken) {
      const nextLevels = applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        true,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      sessionStorage.removeItem(EXTERNAL_RETURN_TOKEN_KEY)
      setSearchParams(getCleanSearchParams(searchParams), { replace: true })
      return
    }

    setSearchParams(getCleanSearchParams(searchParams), { replace: true })
  }, [hasTokenInUrl, progressToken, searchParams, setSearchParams])

  const mappedPositions = useMemo(
    () => positions.map(remapPointToMountain),
    [],
  )
  const mappedSummitPosition = useMemo(
    () => remapPointToMountain(summitPosition),
    [],
  )
  const completedCount = useMemo(
    () => levels.filter((level) => level.status === 'completed').length,
    [levels],
  )
  const totalCamps = levels.length
  const isPassed = completedCount === totalCamps

  const handleTentClick = (level) => {
    if (level.status === 'locked') return
    if (/^https?:\/\//.test(level.url)) {
      const gameUrl = new URL(level.url)
      const returnBase = new URL(
        import.meta.env.BASE_URL || '/',
        window.location.origin,
      )
      const returnUrl = new URL(returnBase.href)
      const returnToken = createReturnToken()
      sessionStorage.setItem(EXTERNAL_RETURN_TOKEN_KEY, returnToken)
      returnUrl.search = ''
      const tokenFromUrlFromParams = searchParams.get('token')
      const playNoFromUrl = searchParams.get('play_no')
      if (tokenFromUrlFromParams) returnUrl.searchParams.set('token', tokenFromUrlFromParams)
      if (playNoFromUrl) returnUrl.searchParams.set('play_no', playNoFromUrl)
      if (tokenFromUrlFromParams) gameUrl.searchParams.set('token', tokenFromUrlFromParams)
      if (playNoFromUrl) gameUrl.searchParams.set('play_no', playNoFromUrl)
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
      <button
        type="button"
        className="result-open-button"
        onClick={() => setIsResultOpen(true)}
      >
        Close
      </button>

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

      {isResultOpen ? (
        <div className="result-overlay" role="dialog" aria-modal="true">
          <div className="result-card">
            <h3 className="result-brand">
              Fire <span>Shield</span>
            </h3>
            <p className="result-subtitle">Scenario-based fire extinguisher training</p>

            <div className={`result-status ${isPassed ? 'pass' : 'incomplete'}`}>
              <div className="result-status-text">{isPassed ? 'PASS' : 'INCOMPLETE'}</div>
              <div className="result-status-note">
                {isPassed
                  ? 'Excellent work. Safety Champion.'
                  : 'Complete all camps to become Safety Champion.'}
              </div>
              <div className="result-score">
                Final Score {completedCount}/{totalCamps}
              </div>
            </div>

            <div className="result-list">
              <div className="result-list-title">Scenario Results</div>
              {levels.map((level) => (
                <div key={level.id} className="result-list-item">
                  <span>{`${level.id}. ${campSubtitleById[level.id] ?? level.title}`}</span>
                  <strong
                    className={
                      level.status === 'completed'
                        ? 'result-item-pass'
                        : 'result-item-incomplete'
                    }
                  >
                    {level.status === 'completed' ? 'PASS' : 'INCOMPLETE'}
                  </strong>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="result-close-button"
              onClick={() => setIsResultOpen(false)}
            >
              CLOSE
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MountainProgressGame