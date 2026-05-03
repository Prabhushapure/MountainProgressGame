import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

const STORAGE_KEY = 'mountainProgressGameLevels'
const PENDING_EXTERNAL_CAMP_KEY = 'mountainPendingExternalCamp'

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

const positions = [
  { top: '95%', left: '60%' },
  { top: '68%', left: '52%' },
  { top: '50%', left: '65%' },
  { top: '30%', left: '50%' },
]

const summitPosition = { top: '15%', left: '50%' }
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
  { id: 1, title: 'Camp 1', status: 'active', url: '/learn-video' },
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
  const [returnPromptCampId, setReturnPromptCampId] = useState(null)
  const levelsRef = useRef(null)

  const [levels, setLevels] = useState(() => {
    const storedLevels = localStorage.getItem(STORAGE_KEY)
    if (!storedLevels) return defaultLevels

    try {
      const parsed = JSON.parse(storedLevels)
      if (Array.isArray(parsed) && parsed.length === defaultLevels.length) {
        return parsed.map((savedLevel, index) => ({
          ...defaultLevels[index],
          status: savedLevel.status ?? defaultLevels[index].status,
        }))
      }
    } catch (error) {
      console.error('Failed to parse level state:', error)
    }

    return defaultLevels
  })

  levelsRef.current = levels

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
  }, [levels])

  useEffect(() => {
    const campIdRaw = searchParams.get('campOutcome') ?? searchParams.get('camp')

    if (!campIdRaw) return

    const campId = Number(campIdRaw)
    if (Number.isNaN(campId)) return

    const { explicit, passed } = getExplicitReturnPassState(searchParams)

    if (explicit) {
      setLevels((prev) => applyCampPassOutcome(prev, campId, passed))
      sessionStorage.removeItem(PENDING_EXTERNAL_CAMP_KEY)
      setSearchParams({}, { replace: true })
      return
    }

    setSearchParams({}, { replace: true })
    const stillActive = levelsRef.current?.some(
      (l) => l.id === campId && l.status === 'active',
    )
    if (stillActive) {
      setReturnPromptCampId(campId)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if ([...searchParams.keys()].length > 0) return
    if (returnPromptCampId !== null) return

    const pending = sessionStorage.getItem(PENDING_EXTERNAL_CAMP_KEY)
    if (!pending) return

    const pid = Number(pending)
    if (!levels.some((l) => l.id === pid && l.status === 'active')) {
      sessionStorage.removeItem(PENDING_EXTERNAL_CAMP_KEY)
      return
    }

    const ref = document.referrer
    const fromAntiz = ref.includes('antiz-digital.com')
    const nav = performance.getEntriesByType?.('navigation')?.[0]
    const backNav = nav?.type === 'back_forward'

    if (!fromAntiz && !backNav) return

    setReturnPromptCampId(pid)
  }, [searchParams, levels, returnPromptCampId])

  const activeIndex = useMemo(
    () => levels.findIndex((level) => level.status === 'active'),
    [levels],
  )

  const mappedPositions = useMemo(
    () => positions.map(remapPointToMountain),
    [],
  )
  const mappedSummitPosition = useMemo(
    () => remapPointToMountain(summitPosition),
    [],
  )

  const playerPosition =
    activeIndex >= 0 ? mappedPositions[activeIndex] : mappedPositions[0]

  const allCampsCompleted = useMemo(
    () => levels.every((level) => level.status === 'completed'),
    [levels],
  )

  const getPathSegmentClass = (segmentIndex) => {
    if (allCampsCompleted) return 'completed'
    if (segmentIndex < activeIndex) return 'completed'
    if (segmentIndex === activeIndex) return 'active'
    return 'upcoming'
  }

  const handleTentClick = (level) => {
    if (level.status === 'locked') return
    if (/^https?:\/\//.test(level.url)) {
      const gameUrl = new URL(level.url)
      const returnBase = new URL(
        import.meta.env.BASE_URL || '/',
        window.location.origin,
      )
      const returnUrl = new URL(returnBase.href)
      returnUrl.search = ''
      returnUrl.searchParams.set('campOutcome', String(level.id))
      gameUrl.searchParams.set('returnUrl', returnUrl.href)
      sessionStorage.setItem(PENDING_EXTERNAL_CAMP_KEY, String(level.id))
      window.location.assign(gameUrl.href)
      return
    }
    navigate(level.url)
  }

  const completeLevel = () => {
    setLevels((prevLevels) => {
      const currentActiveIndex = prevLevels.findIndex(
        (level) => level.status === 'active',
      )
      if (currentActiveIndex === -1) return prevLevels

      const nextLevels = prevLevels.map((l) => ({ ...l }))
      nextLevels[currentActiveIndex].status = 'completed'

      const nextIndex = currentActiveIndex + 1
      if (nextIndex < nextLevels.length) {
        nextLevels[nextIndex].status = 'active'
      }

      return nextLevels
    })
  }

  const resolveReturnPrompt = (passed) => {
    const campId = returnPromptCampId
    setReturnPromptCampId(null)
    sessionStorage.removeItem(PENDING_EXTERNAL_CAMP_KEY)
    if (campId == null) return
    if (passed) {
      setLevels((prev) => applyCampPassOutcome(prev, campId, true))
    }
  }

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(PENDING_EXTERNAL_CAMP_KEY)
    setReturnPromptCampId(null)
    setLevels(defaultLevels)
  }

  return (
    <div
      className="mountain-map"
      style={{
        backgroundImage: `url(${publicUrl('assets/mountain.png')})`,
      }}
    >
      <div className="hud-title">
        <h2>COMBO GAME</h2>
        <p>Fire Safety & Immediate Response</p>
      </div>

      {/* 🔥 PATH LINES */}
      <svg className="path-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id="trailGradientMain"
            x1="0%"
            y1="100%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#ffe082" />
            <stop offset="35%" stopColor="#ffb300" />
            <stop offset="70%" stopColor="#ff8f00" />
            <stop offset="100%" stopColor="#ef6c00" />
          </linearGradient>
          <linearGradient id="trailGradientDone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff59d" />
            <stop offset="50%" stopColor="#ffca28" />
            <stop offset="100%" stopColor="#ffa000" />
          </linearGradient>
          <filter id="trailGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {mappedPositions.map((pos, index) => {
          if (index === mappedPositions.length - 1) return null

          const next = mappedPositions[index + 1]
          const startX = parseFloat(pos.left)
          const startY = parseFloat(pos.top) + 2
          const endX = parseFloat(next.left)
          const endY = parseFloat(next.top) + 2
          const segmentOffset =
            index === 1 ? 6 : index % 2 === 0 ? 4 : -4
          const controlX = (startX + endX) / 2 + segmentOffset
          const controlY = (startY + endY) / 2
          const curvePath =
            index === 2
              ? `M ${startX} ${startY} C ${startX + 18} ${startY - 8} ${endX + 18} ${endY + 8} ${endX} ${endY}`
              : `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`

          const segmentKind = getPathSegmentClass(index)

          return (
            <g
              key={index}
              className={`path-segment path-segment--${segmentKind}`}
            >
              <title>{`Camp ${index + 1} → Camp ${index + 2}`}</title>
              <path
                className="path-line-rail"
                d={curvePath}
                fill="none"
              />
              <path
                className={`path-line-main path-line-main--${segmentKind}`}
                d={curvePath}
                fill="none"
              />
            </g>
          )
        })}
      </svg>

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
              className="tent-image"
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

      {/* 🧗 PLAYER */}
      {activeIndex > 0 && (
        <div
          className="player-indicator"
          style={{
            top: playerPosition.top,
            left: playerPosition.left,
          }}
        >
          🧗
        </div>
      )}

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

      {/* 🎮 CONTROLS */}
      <div className="map-controls">
        <button
          type="button"
          className="complete-level-btn"
          onClick={completeLevel}
        >
          Complete Level
        </button>

        <button
          type="button"
          className="complete-level-btn complete-level-btn--secondary"
          onClick={resetProgress}
        >
          Reset Color
        </button>
      </div>

      {returnPromptCampId != null && (
        <div
          className="camp-return-dialog-backdrop"
          role="presentation"
          onClick={() => resolveReturnPrompt(false)}
        >
          <div
            className="camp-return-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camp-return-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="camp-return-dialog-title">How did you do?</h3>
            <p className="camp-return-dialog__body">
              The map only advances when you <strong>pass</strong> this camp’s
              game. If you did not pass yet, choose “Not yet” and try again.
            </p>
            <div className="camp-return-dialog__actions">
              <button
                type="button"
                className="complete-level-btn"
                onClick={() => resolveReturnPrompt(true)}
              >
                I passed
              </button>
              <button
                type="button"
                className="complete-level-btn complete-level-btn--secondary"
                onClick={() => resolveReturnPrompt(false)}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MountainProgressGame