import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FireShieldBrandHeader, { FireShieldLogoMark } from './FireShieldBrandHeader'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

/** Old persisted progress — cleared once so it no longer drives the map. */
const LEGACY_LEVELS_STORAGE_KEY = 'mountainProgressGameLevels'
const TOKEN_PROGRESS_STORAGE_KEY = 'mountainProgressByToken'
const EXTERNAL_RETURN_TOKEN_KEY = 'mountainProgressExternalReturnToken'
const ANON_SESSION_LEVELS_KEY = 'mountainProgressAnonSessionLevels'
const ANON_CAMP_SCORES_SESSION_KEY = 'mountainProgressAnonCampScores'
const FINAL_SCORE_PARAM_KEY = 'final_score'
const ANON_PROGRESS_TOKEN = '__default__'

const getTokenFromParams = (params) => {
  const token = params.get('token')?.trim()
  return token || null
}

const getReturnUrlFromParams = (params) => {
  const raw = params.get('returnUrl') ?? params.get('return_url')
  return raw?.trim() || null
}

const clearAnonSessionProgress = () => {
  sessionStorage.removeItem(ANON_SESSION_LEVELS_KEY)
  sessionStorage.removeItem(ANON_CAMP_SCORES_SESSION_KEY)
  sessionStorage.removeItem(EXTERNAL_RETURN_TOKEN_KEY)
}

const getDefaultLevels = () => defaultLevels.map((level) => ({ ...level }))

const levelsMatchDefault = (levels) => {
  const expected = getDefaultLevels()
  return (
    levels.length === expected.length &&
    levels.every((l, i) => l.status === expected[i].status)
  )
}

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

const normalizeCampScoresRecord = (scores) => {
  if (!scores || typeof scores !== 'object') return {}
  const next = {}
  for (const [key, value] of Object.entries(scores)) {
    const id = Number(String(key).replace(/^camp/i, ''))
    const points = Number(value)
    if (id >= 1 && id <= 4 && Number.isFinite(points)) {
      next[id] = points
    }
  }
  return next
}

const loadCampScoresByProgressToken = (progressToken) => {
  const tokenData = loadProgressStore()[progressToken]
  return normalizeCampScoresRecord(tokenData?.campScores)
}

const loadAnonCampScores = () => {
  try {
    const raw = sessionStorage.getItem(ANON_CAMP_SCORES_SESSION_KEY)
    if (!raw) return {}
    return normalizeCampScoresRecord(JSON.parse(raw))
  } catch {
    return {}
  }
}

const saveAnonCampScores = (campScores) => {
  const normalized = normalizeCampScoresRecord(campScores)
  if (!Object.keys(normalized).length) {
    sessionStorage.removeItem(ANON_CAMP_SCORES_SESSION_KEY)
    return
  }
  sessionStorage.setItem(ANON_CAMP_SCORES_SESSION_KEY, JSON.stringify(normalized))
}

/** Camp 1 = 100 when completed; camps 2–4 use scores from URL `final_score` only. */
const finalizeCampScores = (scores, levels) => {
  const next = { ...normalizeCampScoresRecord(scores) }
  const camp1 = levels.find((l) => l.id === 1)
  if (camp1?.status === 'completed') {
    next[1] = campPointsById[1] ?? 100
  } else {
    delete next[1]
  }
  return next
}

/** Reads `final_score` from return URL only (same pattern as `status` / `play_result`). */
const getFinalScoreFromParams = (params, campId) => {
  const raw = params.get(FINAL_SCORE_PARAM_KEY)
  if (raw == null || raw === '') return null
  if (campId === 1) return null

  const asNumber = Number(raw)
  if (Number.isFinite(asNumber)) return asNumber

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed
    if (parsed && typeof parsed === 'object' && campId != null) {
      const fromCamp =
        parsed[campId] ??
        parsed[`camp${campId}`] ??
        parsed[String(campId)]
      const n = Number(fromCamp)
      if (Number.isFinite(n)) return n
    }
  } catch {
    /* plain number already handled */
  }

  return null
}

/** Camps 2–4: keep the highest score when a camp is replayed. */
const applyCampScoreWithMax = (existing, campId, newScore) => {
  if (campId == null || campId === 1 || newScore == null) {
    return normalizeCampScoresRecord(existing)
  }
  const next = { ...normalizeCampScoresRecord(existing) }
  const prev = next[campId]
  next[campId] = prev == null ? newScore : Math.max(prev, newScore)
  return next
}

const mergeFinalScoreIntoCampScores = (existing, params, campId) => {
  if (campId == null || campId === 1) return normalizeCampScoresRecord(existing)
  const score = getFinalScoreFromParams(params, campId)
  if (score == null) return normalizeCampScoresRecord(existing)
  return applyCampScoreWithMax(existing, campId, score)
}

const saveLevelsByProgressToken = (progressToken, levels, campScores) => {
  const store = loadProgressStore()
  const allCompleted = levels.every((level) => level.status === 'completed')
  const preservedScores = normalizeCampScoresRecord({
    ...store[progressToken]?.campScores,
    ...campScores,
  })

  if (allCompleted || levelsMatchDefault(levels)) {
    delete store[progressToken]
  } else {
    store[progressToken] = {
      levels: levels.map((l) => ({ status: l.status })),
      ...(Object.keys(preservedScores).length ? { campScores: preservedScores } : {}),
      updatedAt: new Date().toISOString(),
    }
  }
  localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
}

const saveAnonSessionLevels = (levels) => {
  if (levelsMatchDefault(levels)) {
    sessionStorage.removeItem(ANON_SESSION_LEVELS_KEY)
    return
  }
  sessionStorage.setItem(
    ANON_SESSION_LEVELS_KEY,
    JSON.stringify(levels.map((l) => ({ status: l.status }))),
  )
}

const applyOutcomeForContext = (progressToken, hasTokenInUrl, campId, passed, campScores) => {
  const current = hasTokenInUrl
    ? loadLevelsByProgressToken(progressToken)
    : loadAnonSessionLevels()
  const next = applyCampPassOutcome(current, campId, passed)
  const finalized = finalizeCampScores(campScores ?? {}, next)
  if (hasTokenInUrl) {
    saveLevelsByProgressToken(progressToken, next, finalized)
  } else {
    saveAnonSessionLevels(next)
    saveAnonCampScores(finalized)
  }
  return { levels: next, campScores: finalized }
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
    FINAL_SCORE_PARAM_KEY,
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
const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const SUMMIT_FLAG_RED_URL = publicUrl('assets/summit-flag-red.png')
const SUMMIT_FLAG_GREEN_URL = publicUrl('assets/summit-flag-green.png')

const getResultExitUrl = (token) => {
  if (!token) return PARTNER_LICENSE_URL
  const url = new URL(PLATFORM_PLAY_URL)
  url.searchParams.set('token', token)
  return url.href
}
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'
const PLAY_COMPLETE_SENT_KEY_PREFIX = 'mountainProgressPlayCompleteSent:'
const PASS_ICON_URL = publicUrl('assets/result-pass.png')

const getPlayNoFromParams = (params) => {
  const playNo = params.get('play_no')?.trim()
  return playNo || null
}

const getPlayCompleteSentKey = (token, playNo) =>
  `${PLAY_COMPLETE_SENT_KEY_PREFIX}${token}:${playNo}`

const reportPlayComplete = async ({ token, playNo, score, playResult }) => {
  const response = await fetch(PLAY_COMPLETE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      play_no: playNo,
      score,
      play_result: playResult,
    }),
  })
  if (!response.ok) {
    throw new Error(`Play complete API failed (${response.status})`)
  }
}

const positions = [
  { top: '98%', left: '38%' },
  { top: '80%', left: '50%' },
  { top: '59%', left: '54%' },
  { top: '35%', left: '59%' },
]

const summitPosition = { top: '8%', left: '70%' }
const MAP_SCALE_X = 0.95
const MAP_SCALE_Y = 0.9
const MAP_OFFSET_Y = 2

const remapPointToMountain = (point) => {
  const left = parseFloat(point.left)
  const top = parseFloat(point.top)

  return {
    left: `${50 + (left - 50) * MAP_SCALE_X}%`,
    top: `${MAP_OFFSET_Y + top * MAP_SCALE_Y}%`,
  }
}

const offsetPointByPercent = (point, leftOffset = 0, topOffset = 0) => ({
  left: `${parseFloat(point.left) + leftOffset}%`,
  top: `${parseFloat(point.top) + topOffset}%`,
})

const defaultLevels = [
  {
    id: 1,
    title: 'Camp 1',
    activityLabel: 'Fire Safety Video',
    status: 'active',
    url: CAMP1_EXTERNAL_URL,
  },
  {
    id: 2,
    title: 'Camp 2',
    activityLabel: 'Fire Safety Quiz',
    status: 'locked',
    url: CAMP2_EXTERNAL_URL,
  },
  {
    id: 3,
    title: 'Camp 3',
    activityLabel: 'Fire Extinguisher Training',
    status: 'locked',
    url: CAMP3_EXTERNAL_URL,
  },
  {
    id: 4,
    title: 'Camp 4',
    activityLabel: 'Emergency Evacuation Training',
    status: 'locked',
    url: CAMP4_EXTERNAL_URL,
  },
]

const campPointsById = {
  1: 100,
  2: 440,
  3: 500,
  4: 740,
}

const CAMP_IDS = [1, 2, 3, 4]

/** True only when every camp (1–4) is marked completed. */
const areAllCampsCompleted = (levels) =>
  levels.length === CAMP_IDS.length &&
  CAMP_IDS.every((id) => levels.find((l) => l.id === id)?.status === 'completed')

/** Skip splash/instructions when camp 2, 3, or 4 is already unlocked (returning player). */
export const shouldSkipIntroScreens = (searchParams) => {
  const token = searchParams.get('token')?.trim()
  const hasTokenInUrl = Boolean(token)
  const progressToken = token || ANON_PROGRESS_TOKEN
  const levels = hasTokenInUrl
    ? loadLevelsByProgressToken(progressToken)
    : loadAnonSessionLevels()
  return [2, 3, 4].some((id) => {
    const level = levels.find((l) => l.id === id)
    return level?.status !== 'locked'
  })
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
  const playNoFromUrl = useMemo(() => getPlayNoFromParams(searchParams), [searchParams])
  const hasTokenInUrl = Boolean(tokenFromUrl)
  const progressToken = tokenFromUrl || ANON_PROGRESS_TOKEN

  const [levels, setLevels] = useState(() =>
    hasTokenInUrl ? loadLevelsByProgressToken(progressToken) : loadAnonSessionLevels(),
  )
  const [campScoresById, setCampScoresById] = useState(() =>
    hasTokenInUrl ? loadCampScoresByProgressToken(progressToken) : loadAnonCampScores(),
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
    const nextScores = hasTokenInUrl
      ? loadCampScoresByProgressToken(progressToken)
      : loadAnonCampScores()
    queueLevelsUpdate(setLevels, nextLevels)
    setCampScoresById(nextScores)
  }, [hasTokenInUrl, progressToken])

  useEffect(() => {
    if (hasTokenInUrl) {
      saveLevelsByProgressToken(progressToken, levels, campScoresById)
    } else {
      saveAnonSessionLevels(levels)
      saveAnonCampScores(campScoresById)
    }
  }, [hasTokenInUrl, levels, progressToken, campScoresById])

  useEffect(() => {
    if (!isResultOpen) return
    const stored = hasTokenInUrl
      ? loadCampScoresByProgressToken(progressToken)
      : loadAnonCampScores()
    setCampScoresById(finalizeCampScores(stored, levels))
  }, [isResultOpen, hasTokenInUrl, progressToken, levels])

  useEffect(() => {
    const campIdRaw = searchParams.get('campOutcome') ?? searchParams.get('camp')

    if (!campIdRaw) return

    const campId = Number(campIdRaw)
    if (Number.isNaN(campId)) return
    const returnToken = searchParams.get('returnToken')
    const expectedReturnToken = sessionStorage.getItem(EXTERNAL_RETURN_TOKEN_KEY)

    const { explicit, passed } = getExplicitReturnPassState(searchParams)
    const currentLevels = hasTokenInUrl
      ? loadLevelsByProgressToken(progressToken)
      : loadAnonSessionLevels()
    const storedScores = hasTokenInUrl
      ? loadCampScoresByProgressToken(progressToken)
      : loadAnonCampScores()
    const baseScores =
      campId === 1
        ? storedScores
        : mergeFinalScoreIntoCampScores(storedScores, searchParams, campId)

    if (explicit) {
      const { levels: nextLevels, campScores: nextScores } = applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        passed,
        baseScores,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setCampScoresById(nextScores)
      setSearchParams(getCleanSearchParams(searchParams), { replace: true })
      return
    }

    // Valid return from an external camp (Camp 1 learn-video always passes).
    if (returnToken && expectedReturnToken === returnToken) {
      const { levels: nextLevels, campScores: nextScores } = applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        true,
        baseScores,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setCampScoresById(nextScores)
      sessionStorage.removeItem(EXTERNAL_RETURN_TOKEN_KEY)
      setSearchParams(getCleanSearchParams(searchParams), { replace: true })
      return
    }

    if (campId >= 2 && searchParams.has(FINAL_SCORE_PARAM_KEY)) {
      const scoresForUi = finalizeCampScores(baseScores, currentLevels)
      setCampScoresById(scoresForUi)
      if (hasTokenInUrl) {
        saveLevelsByProgressToken(progressToken, currentLevels, scoresForUi)
      } else {
        saveAnonCampScores(scoresForUi)
      }
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
  const mappedSummitFlagPosition = useMemo(
    () => remapPointToMountain(offsetPointByPercent(summitPosition, -6.6, -3.8)),
    [],
  )
  const completedCount = useMemo(
    () => levels.filter((level) => level.status === 'completed').length,
    [levels],
  )
  const getCampScoreDisplay = (campId) => {
    if (campId === 1) {
      return levels.find((l) => l.id === 1)?.status === 'completed'
        ? (campPointsById[1] ?? 100)
        : 0
    }
    return campScoresById[campId] ?? 0
  }

  const earnedPoints = useMemo(
    () =>
      levels.reduce((sum, level) => {
        if (level.id === 1) {
          return level.status === 'completed' ? sum + (campPointsById[1] ?? 100) : sum
        }
        return sum + (campScoresById[level.id] ?? 0)
      }, 0),
    [levels, campScoresById],
  )
  const totalPossiblePoints = useMemo(
    () => levels.reduce((sum, level) => sum + (campPointsById[level.id] ?? 0), 0),
    [levels],
  )
  const totalCamps = levels.length
  const isPassed = completedCount === totalCamps
  const allCampsComplete = useMemo(() => areAllCampsCompleted(levels), [levels])
  const prevAllCampsCompleteRef = useRef(false)

  useEffect(() => {
    const justFinishedAll =
      allCampsComplete && !prevAllCampsCompleteRef.current
    prevAllCampsCompleteRef.current = allCampsComplete

    if (!justFinishedAll || !tokenFromUrl || !playNoFromUrl) return

    const sentKey = getPlayCompleteSentKey(tokenFromUrl, playNoFromUrl)
    if (sessionStorage.getItem(sentKey)) return

    let cancelled = false
    ;(async () => {
      try {
        await reportPlayComplete({
          token: tokenFromUrl,
          playNo: playNoFromUrl,
          score: earnedPoints,
          playResult: 'Pass',
        })
        if (!cancelled) {
          sessionStorage.setItem(sentKey, '1')
        }
      } catch (err) {
        console.error('Failed to report play complete:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [allCampsComplete, tokenFromUrl, playNoFromUrl, earnedPoints])

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
      if (tokenFromUrlFromParams) {
        returnUrl.searchParams.set('token', tokenFromUrlFromParams)
        gameUrl.searchParams.set('token', tokenFromUrlFromParams)
      }
      // Keep play_no on return URL only — external camps must not receive it (they may call play/complete).
      if (playNoFromUrl) {
        returnUrl.searchParams.set('play_no', playNoFromUrl)
      }
      returnUrl.searchParams.set('campOutcome', String(level.id))
      returnUrl.searchParams.set('returnToken', returnToken)
      gameUrl.searchParams.set('returnUrl', returnUrl.href)
      window.location.assign(gameUrl.href)
      return
    }
    navigate(level.url)
  }

  const handleDiscardProgress = () => {
    if (hasTokenInUrl) {
      const store = loadProgressStore()
      delete store[progressToken]
      localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
    } else {
      clearAnonSessionProgress()
    }
    window.location.assign(getResultExitUrl(tokenFromUrl))
  }

  const handleIncompleteResultClose = () => {
    window.location.assign(getResultExitUrl(tokenFromUrl))
  }

  const handlePassResultClose = () => {
    const returnUrlFromParams = getReturnUrlFromParams(searchParams)
    if (!tokenFromUrl && !returnUrlFromParams) {
      clearAnonSessionProgress()
    }
    window.location.assign(getResultExitUrl(tokenFromUrl))
  }

  return (
    <div
      className="mountain-map"
      style={{
        '--mountain-bg-url': `url(${publicUrl('assets/mountain.png')})`,
      }}
    >
      <div className="hud-title">
        <FireShieldLogoMark />
        <h2>FIRE SHIELD 360</h2>
        <p>Fire Safety & Immediate Response</p>
      </div>
      <button
        type="button"
        className="result-open-button"
        onClick={() => setIsResultOpen(true)}
      >
        Exit
      </button>

      <div className="mountain-stage">
        <img
          src={publicUrl('assets/mountain.png')}
          alt="Mountain route"
          className="mountain-image"
          draggable={false}
        />

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

            <div
              className={`camp-label status-${level.status} ${level.id === 1 ? 'camp-label-camp-1' : ''}`}
              role="button"
              tabIndex={level.status === 'locked' ? -1 : 0}
              aria-disabled={level.status === 'locked'}
              onClick={() => handleTentClick(level)}
              onKeyDown={(event) => {
                if (level.status === 'locked') return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleTentClick(level)
                }
              }}
            >
              <span className="camp-label-title">{level.title}</span>
              <span className="camp-label-subtitle">
                {level.activityLabel ?? 'Training Module'}
              </span>
            </div>
          </div>
        ))}

        {/* 🏁 SUMMIT FLAG */}
        <div
          className="summit-flag-node"
          style={{
            top: mappedSummitFlagPosition.top,
            left: mappedSummitFlagPosition.left,
          }}
        >
          <img
            src={isPassed ? SUMMIT_FLAG_GREEN_URL : SUMMIT_FLAG_RED_URL}
            alt={isPassed ? 'Green summit flag' : 'Red summit flag'}
            className="summit-flag-image"
            draggable={false}
          />
        </div>

        {/* 🏁 SUMMIT */}
        <div
          className="summit-node"
          style={{
            top: mappedSummitPosition.top,
            left: mappedSummitPosition.left,
          }}
        >
          <span className="summit-text">Summit</span>
        </div>
      </div>

      {isResultOpen ? (
        <div className="result-overlay" role="dialog" aria-modal="true">
          <div className="result-dialog">
            <div className="result-header">
              <FireShieldBrandHeader className="brand-header--result">
                <h3 className="instruction-title">
                  <span>FIRE</span>SHIELD 360
                </h3>
                <p className="instruction-tagline">
                  Gamified Fire Safety Training for Corporates &amp; Industry
                </p>
              </FireShieldBrandHeader>
            </div>
            <div className={`result-card${isPassed ? '' : ' result-card--incomplete'}`}>

              <div className="result-status">
                <div className={`result-status-text ${isPassed ? 'pass' : 'incomplete'}`}>
                  {isPassed ? 'PASS' : 'INCOMPLETE'}
                </div>
                <div className="result-congrats-row">
                  <div>
                    <div className="result-congrats-title">
                      {isPassed ? 'CONGRATS!' : 'KEEP GOING!'}
                    </div>
                    <div className="result-congrats-note">
                      {isPassed
                        ? 'You have completed all activities at the four Camps and have reached the Summit.'
                        : 'Complete all activities at the four Camps to reach the Summit.'}
                    </div>
                  </div>
                  {isPassed ? (
                    <img
                      className="result-emoji"
                      src={PASS_ICON_URL}
                      alt="Pass icon"
                    />
                  ) : null}
                </div>
              </div>

              <div className="result-list">
                <div className="result-list-title">Activity Scores</div>
                {levels.map((level) => (
                  <div key={level.id} className="result-list-item">
                    <span>{`Camp ${level.id}: ${level.activityLabel ?? level.title}`}</span>
                    <strong>{`${getCampScoreDisplay(level.id)} points`}</strong>
                  </div>
                ))}
                <div className="result-totals">
                  <div className="result-total-row">
                    <span>Total Score:</span>
                    <strong>{`${earnedPoints}/${totalPossiblePoints} points`}</strong>
                  </div>
                </div>
              </div>

              {isPassed ? (
                <button type="button" className="result-close-button" onClick={handlePassResultClose}>
                  CLOSE
                </button>
              ) : (
                <div className="result-incomplete-actions">
                  <button type="button" className="result-close-button" onClick={handleDiscardProgress}>
                    Discard
                  </button>
                  <button type="button" className="result-close-button" onClick={handleIncompleteResultClose}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MountainProgressGame