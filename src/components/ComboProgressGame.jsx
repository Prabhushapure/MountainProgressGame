import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createProgressEngine } from '../progress/createProgressEngine'
import { getActiveTheme } from '../themes'
import FireShieldBrandHeader, { FireShieldLogoMark } from './FireShieldBrandHeader'
import FactorySafetyMapView from './FactorySafetyMapView'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

const getTokenFromParams = (params) => {
  const token = params.get('token')?.trim()
  return token || null
}

const getReturnUrlFromParams = (params) => {
  const raw = params.get('returnUrl') ?? params.get('return_url')
  return raw?.trim() || null
}

const getPlayNoFromParams = (params) => {
  const playNo = params.get('play_no')?.trim()
  return playNo || null
}

const createReturnToken = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const queueLevelsUpdate = (setter, updater) => {
  Promise.resolve().then(() => {
    setter(updater)
  })
}

const remapPointToMap = (point, mapScale) => {
  const left = parseFloat(point.left)
  const top = parseFloat(point.top)

  return {
    left: `${50 + (left - 50) * mapScale.x}%`,
    top: `${mapScale.offsetY + top * mapScale.y}%`,
  }
}

const offsetPointByPercent = (point, leftOffset = 0, topOffset = 0) => ({
  left: `${parseFloat(point.left) + leftOffset}%`,
  top: `${parseFloat(point.top) + topOffset}%`,
})

function ComboProgressGame() {
  const theme = getActiveTheme()
  const engine = useMemo(() => createProgressEngine(theme), [theme.id])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [pendingLevelId, setPendingLevelId] = useState(null)
  const isNavigatingRef = useRef(false)
  const tokenFromUrl = useMemo(() => getTokenFromParams(searchParams), [searchParams])
  const playNoFromUrl = useMemo(() => getPlayNoFromParams(searchParams), [searchParams])
  const hasTokenInUrl = Boolean(tokenFromUrl)
  const progressToken = tokenFromUrl || engine.ANON_PROGRESS_TOKEN

  const markerImageByStatus = useMemo(
    () => ({
      active: publicUrl(theme.assets.markerActive),
      locked: publicUrl(theme.assets.markerLocked),
      completed: publicUrl(theme.assets.markerCompleted),
    }),
    [theme.id],
  )

  const goalFlagUrls = useMemo(
    () => ({
      red: publicUrl(theme.assets.goalRed),
      green: publicUrl(theme.assets.goalGreen),
    }),
    [theme.id],
  )

  const [levels, setLevels] = useState(() =>
    hasTokenInUrl
      ? playNoFromUrl
        ? engine.levelsFromSnapshot(undefined)
        : engine.loadLevelsByProgressToken(progressToken)
      : engine.loadAnonSessionLevels(),
  )
  const [campScoresById, setCampScoresById] = useState(() =>
    hasTokenInUrl
      ? engine.loadCampScoresByProgressToken(progressToken, playNoFromUrl)
      : engine.loadAnonCampScores(),
  )
  const [remoteSyncReady, setRemoteSyncReady] = useState(
    () =>
      !getTokenFromParams(new URLSearchParams(window.location.search)) ||
      !getPlayNoFromParams(new URLSearchParams(window.location.search)),
  )

  useEffect(() => {
    engine.cleanupLegacyStorage()
  }, [engine])

  useEffect(() => {
    if (playNoFromUrl) return

    const nextLevels = hasTokenInUrl
      ? engine.loadLevelsByProgressToken(progressToken)
      : engine.loadAnonSessionLevels()
    const nextScores = hasTokenInUrl
      ? engine.loadCampScoresByProgressToken(progressToken, playNoFromUrl)
      : engine.loadAnonCampScores()
    queueLevelsUpdate(setLevels, nextLevels)
    setCampScoresById(nextScores)
  }, [engine, hasTokenInUrl, progressToken, playNoFromUrl])

  useEffect(() => {
    if (!tokenFromUrl || !playNoFromUrl) {
      setRemoteSyncReady(true)
      return
    }

    setRemoteSyncReady(false)
    let cancelled = false
    ;(async () => {
      try {
        const remote = await engine.fetchPlayProgress({
          token: tokenFromUrl,
          playNo: playNoFromUrl,
        })
        if (cancelled) return

        const local = playNoFromUrl ? null : engine.getLocalTokenSnapshot(tokenFromUrl)
        let merged = null
        if (remote) {
          merged = engine.mergeProgressSnapshots(local, remote)
        } else if (!playNoFromUrl && local) {
          merged = local
        }

        if (merged) {
          const nextLevels = engine.levelsFromSnapshot(merged.levels)
          const nextScores = engine.finalizeCampScores(merged.campScores, nextLevels)

          const persistResult = engine.saveLevelsByProgressToken(
            tokenFromUrl,
            nextLevels,
            nextScores,
            playNoFromUrl,
          )
          engine.syncTokenProgressToServer(tokenFromUrl, playNoFromUrl, persistResult)

          queueLevelsUpdate(setLevels, nextLevels)
          setCampScoresById(nextScores)
        } else if (playNoFromUrl) {
          const nextLevels = engine.levelsFromSnapshot(undefined)
          queueLevelsUpdate(setLevels, nextLevels)
          setCampScoresById({})
        }
      } catch (err) {
        console.error('Failed to load remote progress:', err)
      } finally {
        if (!cancelled) {
          setRemoteSyncReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [engine, tokenFromUrl, playNoFromUrl])

  useEffect(() => {
    if (hasTokenInUrl && playNoFromUrl && !remoteSyncReady) return

    if (hasTokenInUrl) {
      engine.persistTokenProgress(progressToken, levels, campScoresById, playNoFromUrl)
    } else {
      engine.saveAnonSessionLevels(levels)
      engine.saveAnonCampScores(campScoresById)
    }
  }, [
    engine,
    hasTokenInUrl,
    levels,
    progressToken,
    campScoresById,
    playNoFromUrl,
    remoteSyncReady,
  ])

  useEffect(() => {
    if (hasTokenInUrl && playNoFromUrl && !remoteSyncReady) return

    const campIdRaw = searchParams.get('campOutcome') ?? searchParams.get('camp')

    if (!campIdRaw) return

    const campId = Number(campIdRaw)
    if (Number.isNaN(campId)) return
    const returnToken = searchParams.get('returnToken')
    const expectedReturnToken = sessionStorage.getItem(engine.EXTERNAL_RETURN_TOKEN_KEY)

    const hasFinalScoreParam = engine.hasFinalScoreInParams(searchParams)
    const { explicit, passed } = engine.getExplicitReturnPassState(searchParams)
    const currentLevels = hasTokenInUrl
      ? engine.loadLevelsByProgressToken(progressToken)
      : engine.loadAnonSessionLevels()
    const isLastCamp = campId === currentLevels.length
    const storedScores = hasTokenInUrl
      ? engine.loadCampScoresByProgressToken(progressToken, playNoFromUrl)
      : engine.loadAnonCampScores()
    const baseScores =
      campId === 1
        ? storedScores
        : engine.mergeFinalScoreIntoCampScores(storedScores, searchParams, campId)

    // Final-camp completion should win when a score/return signal exists.
    // Some providers send additional outcome keys that can conflict.
    if (isLastCamp && campId >= 2 && (hasFinalScoreParam || Boolean(returnToken))) {
      const { levels: nextLevels, campScores: nextScores } = engine.applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        true,
        baseScores,
        playNoFromUrl,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setCampScoresById(nextScores)
      setSearchParams(engine.getCleanSearchParams(searchParams), { replace: true })
      return
    }

    if (explicit) {
      const { levels: nextLevels, campScores: nextScores } = engine.applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        passed,
        baseScores,
        playNoFromUrl,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setCampScoresById(nextScores)
      setSearchParams(engine.getCleanSearchParams(searchParams), { replace: true })
      return
    }

    if (returnToken && expectedReturnToken === returnToken) {
      const { levels: nextLevels, campScores: nextScores } = engine.applyOutcomeForContext(
        progressToken,
        hasTokenInUrl,
        campId,
        true,
        baseScores,
        playNoFromUrl,
      )
      queueLevelsUpdate(setLevels, nextLevels)
      setCampScoresById(nextScores)
      sessionStorage.removeItem(engine.EXTERNAL_RETURN_TOKEN_KEY)
      setSearchParams(engine.getCleanSearchParams(searchParams), { replace: true })
      return
    }

    if (campId >= 2 && hasFinalScoreParam) {
      const scoresForUi = engine.finalizeCampScores(baseScores, currentLevels)
      setCampScoresById(scoresForUi)
      if (hasTokenInUrl) {
        engine.persistTokenProgress(progressToken, currentLevels, scoresForUi, playNoFromUrl)
      } else {
        engine.saveAnonCampScores(scoresForUi)
      }
    }

    setSearchParams(engine.getCleanSearchParams(searchParams), { replace: true })
  }, [
    engine,
    hasTokenInUrl,
    progressToken,
    playNoFromUrl,
    remoteSyncReady,
    searchParams,
    setSearchParams,
  ])

  const isSafetyBasicsLayout = theme.layoutMode === 'safety-basics-path'

  const mappedPositions = useMemo(
    () =>
      (theme.layout.positions ?? []).map((point) =>
        remapPointToMap(point, theme.layout.mapScale),
      ),
    [theme.id],
  )
  const mappedGoalPosition = useMemo(
    () => remapPointToMap(theme.layout.goalPosition, theme.layout.mapScale),
    [theme.id],
  )
  const mappedGoalFlagPosition = useMemo(
    () =>
      remapPointToMap(
        offsetPointByPercent(
          theme.layout.goalPosition,
          theme.layout.goalFlagOffset.left,
          theme.layout.goalFlagOffset.top,
        ),
        theme.layout.mapScale,
      ),
    [theme.id],
  )
  const completedCount = useMemo(
    () => levels.filter((level) => level.status === 'completed').length,
    [levels],
  )
  const getCampScoreDisplay = (campId) => {
    if (campId === 1) {
      return levels.find((l) => l.id === 1)?.status === 'completed'
        ? (engine.campPointsById[1] ?? 100)
        : 0
    }
    return campScoresById[campId] ?? 0
  }

  const earnedPoints = useMemo(
    () =>
      levels.reduce((sum, level) => {
        if (level.id === 1) {
          return level.status === 'completed'
            ? sum + (engine.campPointsById[1] ?? 100)
            : sum
        }
        return sum + (campScoresById[level.id] ?? 0)
      }, 0),
    [levels, campScoresById, engine.campPointsById],
  )
  const totalCamps = levels.length
  const isPassed = completedCount === totalCamps
  const allCampsComplete = useMemo(() => engine.areAllCampsCompleted(levels), [engine, levels])
  const prevAllCampsCompleteRef = useRef(false)

  useEffect(() => {
    const justFinishedAll = allCampsComplete && !prevAllCampsCompleteRef.current
    prevAllCampsCompleteRef.current = allCampsComplete

    if (!justFinishedAll || !tokenFromUrl || !playNoFromUrl) return

    const sentKey = engine.getPlayCompleteSentKey(tokenFromUrl, playNoFromUrl)
    if (sessionStorage.getItem(sentKey)) return

    let cancelled = false
    ;(async () => {
      try {
        await engine.reportPlayComplete({
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
  }, [engine, allCampsComplete, tokenFromUrl, playNoFromUrl, earnedPoints])

  const handleTentClick = (level) => {
    if (level.status === 'locked') return
    if (isNavigatingRef.current) return

    isNavigatingRef.current = true
    setPendingLevelId(level.id)

    if (/^https?:\/\//.test(level.url)) {
      const gameUrl = new URL(level.url)
      const returnBase = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
      const returnUrl = new URL(returnBase.href)
      const returnToken = createReturnToken()
      sessionStorage.setItem(engine.EXTERNAL_RETURN_TOKEN_KEY, returnToken)
      returnUrl.search = ''
      const tokenFromUrlFromParams = searchParams.get('token')
      const playNoParam = searchParams.get('play_no')
      if (tokenFromUrlFromParams) {
        returnUrl.searchParams.set('token', tokenFromUrlFromParams)
        gameUrl.searchParams.set('token', tokenFromUrlFromParams)
      }
      if (playNoParam) {
        returnUrl.searchParams.set('play_no', playNoParam)
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
      const store = engine.loadProgressStore()
      delete store[progressToken]
      localStorage.setItem(
        `${theme.storagePrefix}ByToken`,
        JSON.stringify(store),
      )
      if (playNoFromUrl) {
        engine.deletePlayProgress({ token: progressToken, playNo: playNoFromUrl }).catch((err) => {
          console.error('Failed to delete remote progress:', err)
        })
        engine.clearCompletedCampScoresFromSession(progressToken, playNoFromUrl)
      }
    } else {
      engine.clearAnonSessionProgress()
    }
    window.location.assign(engine.getResultExitUrl(tokenFromUrl))
  }

  const handleIncompleteResultClose = () => {
    window.location.assign(engine.getResultExitUrl(tokenFromUrl))
  }

  const handlePassResultClose = () => {
    const returnUrlFromParams = getReturnUrlFromParams(searchParams)
    if (!tokenFromUrl && !returnUrlFromParams) {
      engine.clearAnonSessionProgress()
    } else if (tokenFromUrl && playNoFromUrl && allCampsComplete) {
      engine.deletePlayProgress({ token: progressToken, playNo: playNoFromUrl }).catch((err) => {
        console.error('Failed to delete remote progress:', err)
      })
      engine.clearCompletedCampScoresFromSession(progressToken, playNoFromUrl)
    }
    window.location.assign(engine.getResultExitUrl(tokenFromUrl))
  }

  const mapImageUrl = publicUrl(theme.assets.map)
  const passIconUrl = publicUrl(theme.assets.passIcon)

  const resultOverlay = isResultOpen ? (
        <div className="result-overlay" role="dialog" aria-modal="true">
          <div className="result-dialog">
            <div className="result-header">
              {theme.brand.useFireShieldHeader ? (
                <FireShieldBrandHeader className="brand-header--result">
                  <h3 className="instruction-title">
                    <span>{theme.brand.instructionTitleAccent}</span>
                    {theme.brand.instructionTitleRest}
                  </h3>
                  <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
                </FireShieldBrandHeader>
              ) : (
                <div className="brand-header brand-header--result">
                  <h3 className="instruction-title">
                    <span>{theme.brand.instructionTitleAccent}</span>
                    {theme.brand.instructionTitleRest}
                  </h3>
                  <p className="instruction-tagline">{theme.brand.instructionTagline}</p>
                </div>
              )}
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
                      {isPassed ? theme.copy.passCongrats : theme.copy.incompleteNote}
                    </div>
                  </div>
                  {isPassed ? (
                    <img className="result-emoji" src={passIconUrl} alt="Pass icon" />
                  ) : null}
                </div>
              </div>

              <div className="result-list">
                <div className="result-list-title">Activity Scores</div>
                {levels.map((level) => (
                  <div key={level.id} className="result-list-item">
                    <span>{`${level.title}: ${level.activityLabel ?? level.title}`}</span>
                    <strong>{`${getCampScoreDisplay(level.id)} points`}</strong>
                  </div>
                ))}
                <div className="result-totals">
                  <div className="result-total-row">
                    <span>Total Score:</span>
                    <strong>{`${earnedPoints} points`}</strong>
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
                  <button
                    type="button"
                    className="result-close-button"
                    onClick={handleIncompleteResultClose}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
  ) : null

  if (isSafetyBasicsLayout) {
    return (
      <>
        <FactorySafetyMapView
          theme={theme}
          levels={levels}
          pendingLevelId={pendingLevelId}
          onLevelClick={handleTentClick}
          onExitClick={() => setIsResultOpen(true)}
        />
        {resultOverlay}
      </>
    )
  }

  return (
    <div
      className={`mountain-map ${theme.themeClass}`}
      style={{
        '--mountain-bg-url': `url(${mapImageUrl})`,
      }}
    >
      <div className="hud-title">
        {theme.brand.useFireShieldHeader ? <FireShieldLogoMark /> : null}
        <h2>{theme.brand.hudTitle}</h2>
        <p>{theme.brand.hudSubtitle}</p>
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
          src={mapImageUrl}
          alt={theme.copy.mapAlt}
          className="mountain-image"
          draggable={false}
        />

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
              className={[
                'tent-button',
                `status-${level.status}`,
                pendingLevelId === level.id ? 'tent-button--pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleTentClick(level)}
              disabled={level.status === 'locked' || pendingLevelId !== null}
            >
              <img
                src={markerImageByStatus[level.status]}
                alt={level.title}
                className={`tent-image ${
                  theme.layout.firstMarkerLarge && level.id === 1 ? 'tent-image-camp-1' : ''
                }`}
              />
            </button>

            <div
              className={[
                'camp-label',
                `status-${level.status}`,
                theme.layout.labelClassById[level.id] ?? '',
                theme.layout.labelLeftIds.includes(level.id) ? 'camp-label-left' : '',
                pendingLevelId === level.id ? 'camp-label--pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={level.status === 'locked' || pendingLevelId !== null ? -1 : 0}
              aria-disabled={level.status === 'locked' || pendingLevelId !== null}
              onClick={() => handleTentClick(level)}
              onKeyDown={(event) => {
                if (level.status === 'locked' || pendingLevelId !== null) return
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

        <div
          className={`summit-flag-node${isPassed ? ' summit-flag-node--passed' : ''}`}
          style={{
            top: mappedGoalFlagPosition.top,
            left: mappedGoalFlagPosition.left,
          }}
        >
          <img
            src={isPassed ? goalFlagUrls.green : goalFlagUrls.red}
            alt={isPassed ? `Green ${theme.copy.goalLabel}` : `Red ${theme.copy.goalLabel}`}
            className={`summit-flag-image${isPassed ? ' summit-flag-image--passed' : ''}`}
            draggable={false}
          />
        </div>

        <div
          className="summit-node"
          style={{
            top: mappedGoalPosition.top,
            left: mappedGoalPosition.left,
          }}
        >
          <span className="summit-text">{theme.copy.goalLabel}</span>
        </div>
      </div>

      {resultOverlay}
    </div>
  )
}

export default ComboProgressGame
