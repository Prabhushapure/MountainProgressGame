import { useEffect, useMemo, useRef, useState } from 'react'
import { publicUrl } from '../utils/publicUrl'
import { playUnlockSound } from '../utils/unlockSound'
import './FactorySafetyProgress.css'

const DEFAULT_PATH_CURVE = {
  start: { x: 15, y: 84 },
  control: { x: 50, y: 80 },
  end: { x: 94, y: 17 },
}

const UNLOCK_ANIMATION_MS = 750

function quadraticPoint(p0, p1, p2, t) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

function pathCurveToD(curve) {
  const { start, control, end } = curve
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
}

function sampleCurvePoint(curve, t) {
  return quadraticPoint(curve.start, curve.control, curve.end, t)
}

function getCurveSamples(curve, steps = 200) {
  const samples = []
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    samples.push({ t, point: sampleCurvePoint(curve, t) })
  }
  return samples
}

function getTAtArcLength(curve, targetLength) {
  const samples = getCurveSamples(curve)
  let accumulated = 0

  for (let index = 1; index < samples.length; index += 1) {
    const prev = samples[index - 1]
    const current = samples[index]
    const segment = Math.hypot(
      current.point.x - prev.point.x,
      current.point.y - prev.point.y,
    )

    if (accumulated + segment >= targetLength) {
      const ratio = segment > 0 ? (targetLength - accumulated) / segment : 0
      return prev.t + (current.t - prev.t) * ratio
    }

    accumulated += segment
  }

  return 1
}

function getEvenArcLengthPathPositions(count, curve) {
  if (count <= 0) return []
  if (count === 1) {
    return [{ top: `${curve.start.y}%`, left: `${curve.start.x}%` }]
  }

  const samples = getCurveSamples(curve)
  let totalLength = 0
  for (let index = 1; index < samples.length; index += 1) {
    const prev = samples[index - 1].point
    const current = samples[index].point
    totalLength += Math.hypot(current.x - prev.x, current.y - prev.y)
  }

  return Array.from({ length: count }, (_, index) => {
    const targetLength = (totalLength * index) / (count - 1)
    const t =
      index === 0 ? 0 : index === count - 1 ? 1 : getTAtArcLength(curve, targetLength)
    const point = sampleCurvePoint(curve, t)
    return { top: `${point.y}%`, left: `${point.x}%` }
  })
}

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="factory-safety-step-check-svg">
      <path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FactorySafetyStepCard({
  level,
  theme,
  onLevelClick,
  position,
  isUnlocking,
  pendingLevelId,
}) {
  const isLocked = level.status === 'locked'
  const isActive = level.status === 'active'
  const isPending = pendingLevelId === level.id
  const isClickBlocked = pendingLevelId !== null
  const showLockFlip = isUnlocking || isActive
  const showCharacter =
    level.characterIcon && (isActive || isUnlocking)

  return (
    <div
      className={[
        'factory-safety-node',
        level.status === 'active' ? 'factory-safety-node--active' : '',
        isUnlocking ? 'factory-safety-node--unlocking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ top: position.top, left: position.left }}
    >
      {showCharacter ? (
        <img
          src={`${publicUrl(level.characterIcon)}?v=2`}
          alt=""
          decoding="async"
          fetchPriority={isUnlocking || isActive ? 'high' : 'auto'}
          className={[
            'factory-safety-step-character',
            isUnlocking ? 'factory-safety-step-character--enter' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          draggable={false}
        />
      ) : null}

      <div className="factory-safety-step-flip">
        <button
          type="button"
          className={[
            'factory-safety-step',
            `status-${isUnlocking ? 'active' : level.status}`,
            isUnlocking ? 'factory-safety-step--unlocking' : '',
            isPending ? 'factory-safety-step--pending' : '',
          ].join(' ')}
          onClick={() => onLevelClick(level)}
          disabled={(isLocked && !isUnlocking) || isClickBlocked}
          aria-label={level.activityLabel}
        >
          <span
            className={[
              'factory-safety-step-badge',
              'factory-safety-step-badge--status',
              isUnlocking ? 'factory-safety-step-badge--unlocking' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            {showLockFlip ? (
              <span
                className={[
                  'factory-safety-lock-flip',
                  isUnlocking ? 'factory-safety-lock-flip--animating' : '',
                  isActive && !isUnlocking ? 'factory-safety-lock-flip--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <img
                  src={publicUrl(theme.assets.iconLock)}
                  alt=""
                  className="factory-safety-step-lock-icon factory-safety-lock-flip-front"
                  draggable={false}
                />
                <img
                  src={publicUrl(theme.assets.iconUnlock)}
                  alt=""
                  className="factory-safety-step-lock-icon factory-safety-lock-flip-back"
                  draggable={false}
                />
              </span>
            ) : (
              <img
                src={publicUrl(
                  isLocked ? theme.assets.iconLock : theme.assets.iconUnlock,
                )}
                alt=""
                className="factory-safety-step-lock-icon"
                draggable={false}
              />
            )}
          </span>
          <span className="factory-safety-step-label">{level.activityLabel}</span>
          {level.status === 'completed' ? (
            <span
              className="factory-safety-step-badge factory-safety-step-badge--check"
              aria-hidden="true"
            >
              <StepCheckIcon />
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )
}

function FactorySafetyMapView({ theme, levels, pendingLevelId, onLevelClick, onExitClick }) {
  const pathCurve = theme.layout.pathCurve ?? DEFAULT_PATH_CURVE
  const positions = useMemo(
    () => getEvenArcLengthPathPositions(levels.length, pathCurve),
    [levels.length, theme.id],
  )
  const stageRef = useRef(null)
  const prevStatusRef = useRef({})
  const initializedRef = useRef(false)
  const unlockTimersRef = useRef([])
  const [unlockingIds, setUnlockingIds] = useState(() => new Set())

  useEffect(() => {
    levels.forEach((level) => {
      if (!level.characterIcon) return
      const img = new Image()
      img.src = `${publicUrl(level.characterIcon)}?v=2`
    })
  }, [levels])

  useEffect(() => {
    if (!initializedRef.current) {
      levels.forEach((level) => {
        prevStatusRef.current[level.id] = level.status
      })
      initializedRef.current = true
      return undefined
    }

    const newlyUnlocked = levels.filter(
      (level) =>
        prevStatusRef.current[level.id] === 'locked' && level.status === 'active',
    )

    levels.forEach((level) => {
      prevStatusRef.current[level.id] = level.status
    })

    if (!newlyUnlocked.length) return undefined

    playUnlockSound()
    setUnlockingIds((prev) => {
      const next = new Set(prev)
      newlyUnlocked.forEach((level) => next.add(level.id))
      return next
    })

    const timerId = window.setTimeout(() => {
      setUnlockingIds((prev) => {
        const next = new Set(prev)
        newlyUnlocked.forEach((level) => next.delete(level.id))
        return next
      })
    }, UNLOCK_ANIMATION_MS)

    unlockTimersRef.current.push(timerId)

    return () => {
      window.clearTimeout(timerId)
      unlockTimersRef.current = unlockTimersRef.current.filter((id) => id !== timerId)
    }
  }, [levels])

  useEffect(
    () => () => {
      unlockTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    },
    [],
  )

  const backgroundStyle = theme.assets.map
    ? { '--factory-bg-url': `url(${publicUrl(theme.assets.map)})` }
    : undefined

  return (
    <div
      className={`factory-safety-map ${theme.themeClass}`}
      style={backgroundStyle}
    >
      <button type="button" className="factory-safety-exit-button" onClick={onExitClick}>
        Exit
      </button>

      <h1 className="factory-safety-title">
        <span className="factory-safety-title-accent">{theme.brand.instructionTitleAccent}</span>{' '}
        <span className="factory-safety-title-rest">{theme.brand.instructionTitleRest}</span>
      </h1>

      <div className="factory-safety-stage" ref={stageRef}>
        <svg
          className="factory-safety-path-curve"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={pathCurveToD(pathCurve)}
            fill="none"
            stroke="#7ecf4a"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeDasharray="3.5 3"
          />
        </svg>

        {levels.map((level, index) => {
          const position = positions[index]
          if (!position) return null

          return (
            <FactorySafetyStepCard
              key={level.id}
              level={level}
              theme={theme}
              onLevelClick={onLevelClick}
              position={position}
              isUnlocking={unlockingIds.has(level.id)}
              pendingLevelId={pendingLevelId}
            />
          )
        })}
      </div>
    </div>
  )
}

export default FactorySafetyMapView
