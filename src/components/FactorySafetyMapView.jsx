import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { publicUrl } from '../utils/publicUrl'
import { playUnlockSound } from '../utils/unlockSound'
import './FactorySafetyProgress.css'

const DEFAULT_STEP_LADDER = {
  marginTop: 32,
  marginBottom: 36,
  marginRight: 24,
}

const MAN_STEP_GAP = 32
const MAN_WIDTH_RATIO = 0.62
const MAN_MIN_HEIGHT = 120
const MAN_FIGURE_SCALE = 1.2
const MAN_VISUAL_COLUMN_RATIO = 1
const MAN_HEIGHT_STAGE_RATIO = 0.42
const UNLOCK_ANIMATION_MS = 750
const STAGE_BACKDROP_PADDING_X = 32

function getRightColumnPositionsPercent(count) {
  if (count <= 0) return []
  if (count === 1) {
    return [{ top: '50%' }]
  }

  const marginTop = 14
  const marginBottom = 12
  const segments = count - 1
  const pitchY = (100 - marginTop - marginBottom) / segments
  const bottomTop = 100 - marginBottom

  return Array.from({ length: count }, (_, index) => ({
    top: `${bottomTop - index * pitchY}%`,
  }))
}

function getRightColumnPositions(count, stageHeight, cardHeightPx, ladder = DEFAULT_STEP_LADDER) {
  if (count <= 0) return []
  if (count === 1) {
    return [{ top: '50%' }]
  }

  if (stageHeight < 1) {
    return getRightColumnPositionsPercent(count)
  }

  const marginTop = ladder.marginTop ?? DEFAULT_STEP_LADDER.marginTop
  const marginBottom = ladder.marginBottom ?? DEFAULT_STEP_LADDER.marginBottom
  const usableH = Math.max(0, stageHeight - marginTop - marginBottom)
  const segments = count - 1
  const edgeGap = (usableH - count * cardHeightPx) / segments

  if (edgeGap < 0) {
    return getRightColumnPositionsPercent(count)
  }

  const centerPitch = edgeGap + cardHeightPx
  const bottomCenterY = stageHeight - marginBottom - cardHeightPx / 2

  return Array.from({ length: count }, (_, index) => {
    const centerY = bottomCenterY - index * centerPitch
    return { top: `${(centerY / stageHeight) * 100}%` }
  })
}

function measureStepsColumn(stageElement) {
  const nodes = stageElement.querySelectorAll('.factory-safety-node')
  if (!nodes.length) {
    return { top: 0, height: 0 }
  }

  const stageRect = stageElement.getBoundingClientRect()
  const firstRect = nodes[0].getBoundingClientRect()
  const lastRect = nodes[nodes.length - 1].getBoundingClientRect()
  const top = lastRect.top - stageRect.top
  const bottom = firstRect.bottom - stageRect.top

  return {
    top: Math.max(0, top),
    height: Math.max(0, bottom - top),
  }
}

function getManSlotHeight(stageHeight) {
  if (stageHeight < 1) return MAN_MIN_HEIGHT
  return Math.max(MAN_MIN_HEIGHT, stageHeight * MAN_HEIGHT_STAGE_RATIO)
}

function getManDimensions(columnHeight, stageHeight) {
  if (columnHeight > 0) {
    const visualHeight = columnHeight * MAN_VISUAL_COLUMN_RATIO
    const manSlotHeight = Math.max(MAN_MIN_HEIGHT, visualHeight / MAN_FIGURE_SCALE)
    const manWidth = visualHeight * MAN_WIDTH_RATIO
    return { manSlotHeight, manWidth }
  }

  const manSlotHeight = getManSlotHeight(stageHeight)
  return {
    manSlotHeight,
    manWidth: manSlotHeight * MAN_FIGURE_SCALE * MAN_WIDTH_RATIO,
  }
}

function measureCenteredLayout(stageElement) {
  const column = measureStepsColumn(stageElement)
  const stageHeight = stageElement.clientHeight
  const stageWidth = stageElement.clientWidth
  const cardWidth =
    stageElement.querySelector('.factory-safety-step-flip')?.getBoundingClientRect().width ?? 225

  const { manSlotHeight, manWidth } = getManDimensions(column.height, stageHeight)
  const manHeight = manSlotHeight
  const gap = MAN_STEP_GAP
  const totalGroupWidth = manWidth + gap + cardWidth
  const groupLeft = Math.max(0, (stageWidth - totalGroupWidth) / 2)
  const manLeft = groupLeft
  const cardLeft = groupLeft + manWidth + gap
  const manTop =
    column.height > 0
      ? column.top + column.height - manSlotHeight
      : Math.max(0, stageHeight - manSlotHeight)

  return {
    ...column,
    cardLeft,
    cardWidth,
    manLeft,
    manHeight,
    manWidth,
    manTop,
    groupWidth: cardLeft - manLeft + cardWidth,
  }
}

function measureLayoutWithBackdrop(stageElement) {
  const layout = measureCenteredLayout(stageElement)
  const mapEl = stageElement.parentElement
  const stageRect = stageElement.getBoundingClientRect()
  const mapRect = mapEl?.getBoundingClientRect() ?? stageRect

  return {
    ...layout,
    stageOffsetLeft: stageRect.left - mapRect.left,
  }
}

function measureStepPositions(count, stageElement, ladder = DEFAULT_STEP_LADDER) {
  if (!stageElement || count === 0) {
    return getRightColumnPositionsPercent(count)
  }

  const cardHeightPx =
    stageElement.querySelector('.factory-safety-step')?.getBoundingClientRect().height ?? 46

  return getRightColumnPositions(
    count,
    stageElement.clientHeight,
    cardHeightPx,
    ladder,
  )
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

  return (
    <div
      className={[
        'factory-safety-node',
        level.status === 'active' ? 'factory-safety-node--active' : '',
        isUnlocking ? 'factory-safety-node--unlocking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ top: position.top }}
    >
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

function FactorySafetyMapView({
  theme,
  levels,
  pendingLevelId,
  onLevelClick,
  onExitClick,
  onHelpClick,
}) {
  const stepLadder = useMemo(
    () => theme.layout.stepLadder ?? DEFAULT_STEP_LADDER,
    [theme.id],
  )
  const stageRef = useRef(null)
  const [positions, setPositions] = useState(() =>
    getRightColumnPositionsPercent(levels.length),
  )
  const [columnMetrics, setColumnMetrics] = useState({
    top: 0,
    height: 0,
    cardLeft: 0,
    cardWidth: 0,
    manLeft: 0,
    manHeight: 0,
    manWidth: 0,
    manTop: 0,
    groupWidth: 0,
    stageOffsetLeft: 0,
  })
  const prevStatusRef = useRef({})
  const initializedRef = useRef(false)
  const unlockTimersRef = useRef([])
  const [unlockingIds, setUnlockingIds] = useState(() => new Set())

  const remeasureLayout = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    requestAnimationFrame(() => {
      setColumnMetrics(measureLayoutWithBackdrop(stage))
      requestAnimationFrame(() => {
        setColumnMetrics(measureLayoutWithBackdrop(stage))
      })
    })
  }, [])

  useEffect(() => {
    levels.forEach((level) => {
      if (!level.characterIcon) return
      const img = new Image()
      img.src = `${publicUrl(level.characterIcon)}?v=2`
    })
  }, [levels])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const updatePositions = () => {
      setPositions(measureStepPositions(levels.length, stage, stepLadder))
      requestAnimationFrame(() => {
        setColumnMetrics(measureLayoutWithBackdrop(stage))
        requestAnimationFrame(() => {
          setColumnMetrics(measureLayoutWithBackdrop(stage))
        })
      })
    }

    updatePositions()

    const observer = new ResizeObserver(updatePositions)
    observer.observe(stage)

    return () => {
      observer.disconnect()
    }
  }, [levels.length, stepLadder, theme.id])

  const characterLevel = useMemo(
    () =>
      levels.find(
        (level) =>
          level.characterIcon &&
          (level.status === 'active' || unlockingIds.has(level.id)),
      ),
    [levels, unlockingIds],
  )
  const isCharacterUnlocking = characterLevel
    ? unlockingIds.has(characterLevel.id)
    : false

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const frameId = requestAnimationFrame(() => {
      remeasureLayout()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [positions, levels.length, characterLevel?.id, remeasureLayout])

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

  const backgroundLevel = useMemo(
    () =>
      levels.find(
        (level) =>
          level.stepBackground &&
          (level.status === 'active' || unlockingIds.has(level.id)),
      ),
    [levels, unlockingIds],
  )

  const backgroundAsset = backgroundLevel?.stepBackground ?? theme.assets.map

  const backdropStyle = useMemo(() => {
    if (!backgroundAsset) return undefined

    const hasMeasuredGroup =
      columnMetrics.groupWidth > 0 && columnMetrics.manLeft >= 0

    if (!hasMeasuredGroup) {
      return {
        '--factory-stage-bg-url': `url(${publicUrl(backgroundAsset)})`,
        left: '50%',
        width: 'min(520px, 92vw)',
        transform: 'translateX(-50%)',
      }
    }

    const left =
      columnMetrics.stageOffsetLeft +
      Math.max(0, columnMetrics.manLeft - STAGE_BACKDROP_PADDING_X)
    const width = columnMetrics.groupWidth + STAGE_BACKDROP_PADDING_X * 2

    return {
      '--factory-stage-bg-url': `url(${publicUrl(backgroundAsset)})`,
      left: `${left}px`,
      width: `${width}px`,
      transform: 'none',
    }
  }, [
    backgroundAsset,
    columnMetrics.groupWidth,
    columnMetrics.manLeft,
    columnMetrics.stageOffsetLeft,
  ])

  const stageStyle = {
    '--factory-steps-column-height': `${columnMetrics.height}px`,
    '--factory-steps-column-top': `${columnMetrics.top}px`,
    '--factory-card-left': `${columnMetrics.cardLeft}px`,
    '--factory-man-left': `${columnMetrics.manLeft}px`,
    '--factory-man-height': `${columnMetrics.manHeight}px`,
    '--factory-man-width': `${columnMetrics.manWidth ?? 0}px`,
    '--factory-man-top': `${columnMetrics.manTop}px`,
    '--factory-man-figure-scale': String(MAN_FIGURE_SCALE),
  }

  return (
    <div className={`factory-safety-map ${theme.themeClass}`}>
      {backdropStyle ? (
        <div
          className="factory-safety-stage-backdrop"
          style={backdropStyle}
          aria-hidden="true"
        />
      ) : null}
      <div className="factory-safety-map-actions">
        <button type="button" className="factory-safety-exit-button" onClick={onHelpClick}>
          Help
        </button>
        <button type="button" className="factory-safety-exit-button" onClick={onExitClick}>
          Exit
        </button>
      </div>

      <h1 className="factory-safety-title">
        <span className="factory-safety-title-accent">{theme.brand.instructionTitleAccent}</span>{' '}
        <span className="factory-safety-title-rest">{theme.brand.instructionTitleRest}</span>
      </h1>

      <div className="factory-safety-stage" ref={stageRef} style={stageStyle}>
        {characterLevel?.characterIcon ? (
          <div
            className={[
              'factory-safety-character-slot',
              isCharacterUnlocking ? 'factory-safety-character-slot--enter' : '',
              'factory-safety-character-slot--active',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <img
              src={`${publicUrl(characterLevel.characterIcon)}?v=2`}
              alt=""
              decoding="async"
              fetchPriority="high"
              className="factory-safety-column-character"
              onLoad={remeasureLayout}
              draggable={false}
            />
          </div>
        ) : null}

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
