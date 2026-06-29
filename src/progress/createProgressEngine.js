import {
  deletePlayProgress,
  fetchPlayProgress,
  savePlayProgress,
} from '../api/playProgress'

const FINAL_SCORE_PARAM_KEYS = ['final_score', 'finalScore', 'score', 'points']
const ANON_PROGRESS_TOKEN = '__default__'
const RETURN_OUTCOME_PARAM_KEYS = ['pass', 'result', 'status', 'play_result']

export function createProgressEngine(theme) {
  const defaultLevels = theme.levels.map((level) => ({ ...level }))
  const campPointsById = Object.fromEntries(
    theme.levels.map((level) => [level.id, level.maxPoints]),
  )
  const fixedCompletionCampIds = theme.scoring?.fixedCompletionCampIds ?? [1]
  const fixedCompletionPoints = theme.scoring?.fixedCompletionPoints
  const levelIds = theme.levels.map((level) => level.id)
  const maxLevelId = Math.max(...levelIds)

  const isFixedScoreCamp = (campId) => fixedCompletionCampIds.includes(campId)

  const getFixedCampPoints = (campId) =>
    fixedCompletionPoints ?? campPointsById[campId] ?? 100

  const LEGACY_LEVELS_STORAGE_KEY = `${theme.storagePrefix}GameLevels`
  const TOKEN_PROGRESS_STORAGE_KEY = `${theme.storagePrefix}ByToken`
  const EXTERNAL_RETURN_TOKEN_KEY = `${theme.storagePrefix}ExternalReturnToken`
  const ANON_SESSION_LEVELS_KEY = `${theme.storagePrefix}AnonSessionLevels`
  const ANON_CAMP_SCORES_SESSION_KEY = `${theme.storagePrefix}AnonCampScores`
  const COMPLETED_CAMP_SCORES_SESSION_KEY_PREFIX = `${theme.storagePrefix}CompletedCampScores:`
  const PLAY_COMPLETE_SENT_KEY_PREFIX = `${theme.storagePrefix}PlayCompleteSent:`

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

  const getLocalTokenSnapshot = (progressToken) => loadProgressStore()[progressToken] ?? null

  const levelsFromSnapshot = (statuses) => {
    if (!Array.isArray(statuses) || statuses.length !== defaultLevels.length) {
      return getDefaultLevels()
    }

    return defaultLevels.map((def, i) => ({
      ...def,
      status: statuses[i]?.status ?? def.status,
    }))
  }

  const STATUS_RANK = { locked: 0, active: 1, completed: 2 }

  const mergeLevelStatuses = (localLevels, remoteLevels) => {
    if (!Array.isArray(remoteLevels) || remoteLevels.length !== defaultLevels.length) {
      return levelsFromSnapshot(localLevels)
    }
    if (!Array.isArray(localLevels) || localLevels.length !== defaultLevels.length) {
      return levelsFromSnapshot(remoteLevels)
    }

    return defaultLevels.map((def, i) => {
      const localStatus = localLevels[i]?.status ?? def.status
      const remoteStatus = remoteLevels[i]?.status ?? def.status
      const status =
        STATUS_RANK[localStatus] >= STATUS_RANK[remoteStatus] ? localStatus : remoteStatus
      return { status }
    })
  }

  const normalizeCampScoresRecord = (scores) => {
    if (!scores || typeof scores !== 'object') return {}
    const next = {}
    for (const [key, value] of Object.entries(scores)) {
      const id = Number(String(key).replace(/^camp/i, ''))
      const points = Number(value)
      if (id >= 1 && id <= maxLevelId && Number.isFinite(points)) {
        next[id] = points
      }
    }
    return next
  }

  const mergeCampScoresSnapshots = (localScores, remoteScores) => {
    const merged = normalizeCampScoresRecord(remoteScores)
    const local = normalizeCampScoresRecord(localScores)
    for (const [key, value] of Object.entries(local)) {
      const id = Number(key)
      const prev = merged[id]
      merged[id] = prev == null ? value : Math.max(prev, value)
    }
    return merged
  }

  const mergeProgressSnapshots = (local, remote) => {
    if (!remote) return local
    if (!local) return remote

    const levels = mergeLevelStatuses(local.levels, remote.levels)
    const campScores = mergeCampScoresSnapshots(local.campScores, remote.campScores)
    const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0
    const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0

    return {
      levels,
      ...(Object.keys(campScores).length ? { campScores } : {}),
      updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
    }
  }

  const loadLevelsByProgressToken = (progressToken) => {
    const statuses = getLocalTokenSnapshot(progressToken)?.levels
    return levelsFromSnapshot(statuses)
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

  const getCompletedCampScoresSessionKey = (progressToken, playNo) => {
    if (playNo) {
      return `${COMPLETED_CAMP_SCORES_SESSION_KEY_PREFIX}${progressToken}:${playNo}`
    }
    return `${COMPLETED_CAMP_SCORES_SESSION_KEY_PREFIX}${progressToken}`
  }

  const loadCompletedCampScoresFromSession = (progressToken, playNo) => {
    try {
      const raw = sessionStorage.getItem(getCompletedCampScoresSessionKey(progressToken, playNo))
      if (!raw) return {}
      return normalizeCampScoresRecord(JSON.parse(raw))
    } catch {
      return {}
    }
  }

  const saveCompletedCampScoresToSession = (progressToken, campScores, playNo) => {
    const normalized = normalizeCampScoresRecord(campScores)
    const key = getCompletedCampScoresSessionKey(progressToken, playNo)
    if (!Object.keys(normalized).length) {
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, JSON.stringify(normalized))
  }

  const clearCompletedCampScoresFromSession = (progressToken, playNo) => {
    if (playNo) {
      sessionStorage.removeItem(getCompletedCampScoresSessionKey(progressToken, playNo))
    }
    sessionStorage.removeItem(getCompletedCampScoresSessionKey(progressToken))
  }

  const loadCampScoresByProgressToken = (progressToken, playNo) => {
    const fromSession = loadCompletedCampScoresFromSession(progressToken, playNo)
    if (playNo) {
      return fromSession
    }

    const tokenData = loadProgressStore()[progressToken]
    const fromLocal = normalizeCampScoresRecord(tokenData?.campScores)
    return mergeCampScoresSnapshots(fromSession, fromLocal)
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

  const finalizeCampScores = (scores, levels) => {
    const next = { ...normalizeCampScoresRecord(scores) }
    fixedCompletionCampIds.forEach((campId) => {
      const camp = levels.find((l) => l.id === campId)
      if (camp?.status === 'completed') {
        next[campId] = getFixedCampPoints(campId)
      } else {
        delete next[campId]
      }
    })
    return next
  }

  const getFinalScoreFromParams = (params, campId) => {
    const raw = FINAL_SCORE_PARAM_KEYS.map((key) => params.get(key)).find(
      (value) => value != null && value !== '',
    )
    if (raw == null || raw === '') return null
    if (isFixedScoreCamp(campId)) return null

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

  const applyCampScoreWithMax = (existing, campId, newScore) => {
    if (campId == null || isFixedScoreCamp(campId) || newScore == null) {
      return normalizeCampScoresRecord(existing)
    }
    const next = { ...normalizeCampScoresRecord(existing) }
    const prev = next[campId]
    next[campId] = prev == null ? newScore : Math.max(prev, newScore)
    return next
  }

  const mergeFinalScoreIntoCampScores = (existing, params, campId) => {
    if (campId == null || isFixedScoreCamp(campId)) return normalizeCampScoresRecord(existing)
    const score = getFinalScoreFromParams(params, campId)
    if (score == null) return normalizeCampScoresRecord(existing)
    return applyCampScoreWithMax(existing, campId, score)
  }

  const hasFinalScoreInParams = (params) =>
    FINAL_SCORE_PARAM_KEYS.some((key) => {
      const value = params.get(key)
      return value != null && value !== ''
    })

  const saveLevelsByProgressToken = (progressToken, levels, campScores, playNo) => {
    const store = loadProgressStore()
    const allCompleted = levels.every((level) => level.status === 'completed')
    const preservedScores = normalizeCampScoresRecord({
      ...store[progressToken]?.campScores,
      ...campScores,
    })

    if (allCompleted) {
      saveCompletedCampScoresToSession(progressToken, preservedScores, playNo)
      delete store[progressToken]
      localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
      return {
        deleted: false,
        allCompleted: true,
        snapshot: {
          levels: levels.map((l) => ({ status: l.status })),
          ...(Object.keys(preservedScores).length ? { campScores: preservedScores } : {}),
          updatedAt: new Date().toISOString(),
          completed: true,
        },
      }
    }

    if (levelsMatchDefault(levels)) {
      delete store[progressToken]
      localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
      return { deleted: true, snapshot: null }
    }

    const snapshot = {
      levels: levels.map((l) => ({ status: l.status })),
      ...(Object.keys(preservedScores).length ? { campScores: preservedScores } : {}),
      updatedAt: new Date().toISOString(),
    }
    store[progressToken] = snapshot
    localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
    return { deleted: false, snapshot }
  }

  const syncTokenProgressToServer = (progressToken, playNo, result) => {
    if (!playNo) return

    if (result.deleted || !result.snapshot) return

    if (result.allCompleted) {
      saveCompletedCampScoresToSession(progressToken, result.snapshot.campScores, playNo)
    }

    savePlayProgress({
      comboTheme: theme.id,
      token: progressToken,
      playNo,
      levels: result.snapshot.levels,
      campScores: result.snapshot.campScores,
      updatedAt: result.snapshot.updatedAt,
    }).catch((err) => {
      console.error('Failed to save remote progress:', err)
    })
  }

  const persistTokenProgress = (progressToken, levels, campScores, playNo) => {
    const result = saveLevelsByProgressToken(progressToken, levels, campScores, playNo)
    syncTokenProgressToServer(progressToken, playNo, result)
    return result
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

  const applyOutcomeForContext = (
    progressToken,
    hasTokenInUrl,
    campId,
    passed,
    campScores,
    playNo,
  ) => {
    const current = hasTokenInUrl
      ? loadLevelsByProgressToken(progressToken)
      : loadAnonSessionLevels()
    const next = applyCampPassOutcome(current, campId, passed)
    const finalized = finalizeCampScores(campScores ?? {}, next)
    if (hasTokenInUrl) {
      persistTokenProgress(progressToken, next, finalized, playNo)
    } else {
      saveAnonSessionLevels(next)
      saveAnonCampScores(finalized)
    }
    return { levels: next, campScores: finalized }
  }

  const parseOutcomeToken = (raw) => {
    if (raw == null || raw === '') return null
    const n = String(raw).trim().toLowerCase()
    if (['true', '1', 'pass', 'passed', 'success'].includes(n)) return true
    if (['false', '0', 'fail', 'failed', 'failure'].includes(n)) return false
    return null
  }

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
      ...FINAL_SCORE_PARAM_KEYS,
    ].forEach((key) => next.delete(key))
    return next
  }

  const clearAnonSessionProgress = () => {
    sessionStorage.removeItem(ANON_SESSION_LEVELS_KEY)
    sessionStorage.removeItem(ANON_CAMP_SCORES_SESSION_KEY)
    sessionStorage.removeItem(EXTERNAL_RETURN_TOKEN_KEY)
  }

  const areAllCampsCompleted = (levels) =>
    levels.length === levelIds.length &&
    levelIds.every((id) => levels.find((l) => l.id === id)?.status === 'completed')

  const RETURN_SKIP_INTRO_PARAM_KEYS = [
    'campOutcome',
    'camp',
    'returnToken',
    ...RETURN_OUTCOME_PARAM_KEYS,
    ...FINAL_SCORE_PARAM_KEYS,
  ]

  const shouldSkipIntroScreens = (searchParams) => {
    if (RETURN_SKIP_INTRO_PARAM_KEYS.some((key) => searchParams.has(key))) {
      return true
    }

    const token = searchParams.get('token')?.trim()
    const hasTokenInUrl = Boolean(token)
    const progressToken = token || ANON_PROGRESS_TOKEN
    const levels = hasTokenInUrl
      ? loadLevelsByProgressToken(progressToken)
      : loadAnonSessionLevels()

    return !levelsMatchDefault(levels)
  }

  const getResultExitUrl = (token) => {
    if (!token) return theme.urls.partnerLicense
    const url = new URL(theme.urls.platformPlay)
    url.searchParams.set('token', token)
    return url.href
  }

  const getPlayCompleteSentKey = (token, playNo) =>
    `${PLAY_COMPLETE_SENT_KEY_PREFIX}${token}:${playNo}`

  const reportPlayComplete = async ({ token, playNo, score, playResult }) => {
    const response = await fetch(theme.urls.playCompleteApi, {
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

  const cleanupLegacyStorage = () => {
    localStorage.removeItem(LEGACY_LEVELS_STORAGE_KEY)
    const store = loadProgressStore()
    if (store[ANON_PROGRESS_TOKEN]) {
      delete store[ANON_PROGRESS_TOKEN]
      localStorage.setItem(TOKEN_PROGRESS_STORAGE_KEY, JSON.stringify(store))
    }
  }

  return {
    ANON_PROGRESS_TOKEN,
    EXTERNAL_RETURN_TOKEN_KEY,
    FINAL_SCORE_PARAM_KEY: FINAL_SCORE_PARAM_KEYS[0],
    FINAL_SCORE_PARAM_KEYS,
    campPointsById,
    getFixedCampPoints,
    isFixedScoreCamp,
    cleanupLegacyStorage,
    clearAnonSessionProgress,
    clearCompletedCampScoresFromSession,
    areAllCampsCompleted,
    applyOutcomeForContext,
    fetchPlayProgress: (args) => fetchPlayProgress({ comboTheme: theme.id, ...args }),
    deletePlayProgress: (args) => deletePlayProgress({ comboTheme: theme.id, ...args }),
    finalizeCampScores,
    getCleanSearchParams,
    getExplicitReturnPassState,
    getLocalTokenSnapshot,
    getPlayCompleteSentKey,
    getResultExitUrl,
    levelsFromSnapshot,
    loadAnonCampScores,
    loadAnonSessionLevels,
    loadCampScoresByProgressToken,
    loadLevelsByProgressToken,
    loadProgressStore,
    mergeFinalScoreIntoCampScores,
    hasFinalScoreInParams,
    mergeProgressSnapshots,
    persistTokenProgress,
    reportPlayComplete,
    saveAnonCampScores,
    saveAnonSessionLevels,
    saveLevelsByProgressToken,
    shouldSkipIntroScreens,
    syncTokenProgressToServer,
  }
}
