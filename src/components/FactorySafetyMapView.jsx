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
const MAN_STEP_GAP_NARROW = 10
const MAN_WIDTH_RATIO = 0.62
const MAN_MIN_HEIGHT = 120
const MAN_MIN_HEIGHT_NARROW = 100
const MAN_FIGURE_SCALE = 1.2
const MAN_VISUAL_COLUMN_RATIO = 1
const MAN_VISUAL_COLUMN_RATIO_NARROW = 0.96
const MAN_HEIGHT_STAGE_RATIO = 0.42
const NARROW_STAGE_WIDTH = 480
const STAGE_EDGE_PADDING = 6
const UNLOCK_ANIMATION_MS = 750
const STAGE_BACKDROP_PADDING_X = 32
const NARROW_LADDER = {
  marginTop: 18,
  marginBottom: 22,
  marginRight: 12,
}

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

function getMaxManWidth(stageWidth, cardWidth, isNarrow) {
  if (!isNarrow || stageWidth <= 0) {
    return stageWidth > 0 ? stageWidth * 0.42 : Infinity
  }

  const reserved =
    STAGE_EDGE_PADDING * 2 + MAN_STEP_GAP_NARROW + Math.max(0, cardWidth)
  return Math.max(92, stageWidth - reserved)
}

function getManDimensions(columnHeight, stageHeight, stageWidth, isNarrow, cardWidth) {
  const visualRatio = isNarrow ? MAN_VISUAL_COLUMN_RATIO_NARROW : MAN_VISUAL_COLUMN_RATIO
  const maxManWidth = getMaxManWidth(stageWidth, cardWidth, isNarrow)
  const minHeight = isNarrow ? MAN_MIN_HEIGHT_NARROW : MAN_MIN_HEIGHT

  if (columnHeight > 0) {
    const visualHeight = columnHeight * visualRatio
    let manSlotHeight = Math.max(minHeight, visualHeight / MAN_FIGURE_SCALE)
    let manWidth = visualHeight * MAN_WIDTH_RATIO

    if (manWidth > maxManWidth) {
      const scale = maxManWidth / manWidth
      manWidth = maxManWidth
      manSlotHeight *= scale
    }

    return { manSlotHeight, manWidth }
  }

  const manSlotHeight = getManSlotHeight(stageHeight)
  let manWidth = manSlotHeight * MAN_FIGURE_SCALE * MAN_WIDTH_RATIO
  if (manWidth > maxManWidth) {
    const scale = maxManWidth / manWidth
    manWidth = maxManWidth
    return { manSlotHeight: manSlotHeight * scale, manWidth }
  }

  return { manSlotHeight, manWidth }
}

function measureCenteredLayout(
  stageElement,
  ladder = DEFAULT_STEP_LADDER,
  { useStageHeightForMan = false } = {},
) {
  const column = measureStepsColumn(stageElement)
  const stageHeight = stageElement.clientHeight
  const stageWidth = stageElement.clientWidth
  const isNarrow = stageWidth < NARROW_STAGE_WIDTH
  const cardWidth =
    stageElement.querySelector('.factory-safety-step-flip')?.getBoundingClientRect().width ?? 225

  const manSizingColumnHeight = useStageHeightForMan ? 0 : column.height

  const { manSlotHeight, manWidth } = getManDimensions(
    manSizingColumnHeight,
    stageHeight,
    stageWidth,
    isNarrow,
    cardWidth,
  )
  const manHeight = manSlotHeight
  const gap = isNarrow ? MAN_STEP_GAP_NARROW : MAN_STEP_GAP
  const edgePadding = isNarrow ? STAGE_EDGE_PADDING : 0
  const maxContentWidth = Math.max(0, stageWidth - edgePadding * 2)
  const totalGroupWidth = manWidth + gap + cardWidth

  let manLeft = Math.max(edgePadding, (stageWidth - totalGroupWidth) / 2)
  let cardLeft = manLeft + manWidth + gap

  if (cardLeft + cardWidth > stageWidth - edgePadding) {
    cardLeft = Math.max(edgePadding, stageWidth - edgePadding - cardWidth)
    manLeft = Math.max(edgePadding, cardLeft - gap - manWidth)
  }

  if (manLeft + manWidth + gap + cardWidth > stageWidth - edgePadding) {
    const overflow = manLeft + manWidth + gap + cardWidth - (stageWidth - edgePadding)
    manLeft = Math.max(edgePadding, manLeft - overflow)
  }

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
    stageWidth,
    isNarrow,
    groupWidth: Math.min(maxContentWidth, cardLeft - manLeft + cardWidth),
  }
}

function measureLayoutWithBackdrop(
  stageElement,
  ladder = DEFAULT_STEP_LADDER,
  layoutOptions = {},
) {
  const layout = measureCenteredLayout(stageElement, ladder, layoutOptions)
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
                  className="factory-safety-step-lock-icon factory-safety-step-unlock-icon factory-safety-lock-flip-back"
                  draggable={false}
                />
              </span>
            ) : (
              <img
                src={publicUrl(
                  isLocked ? theme.assets.iconLock : theme.assets.iconUnlock,
                )}
                alt=""
                className={[
                  'factory-safety-step-lock-icon',
                  isLocked ? '' : 'factory-safety-step-unlock-icon',
                ]
                  .filter(Boolean)
                  .join(' ')}
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
  allModulesComplete = false,
}) {
  const customPositions = useMemo(() => {
    const configured = theme.layout.positions
    if (!Array.isArray(configured) || configured.length !== levels.length) {
      return null
    }
    return configured
      .map((point) => {
        const top = Number.parseFloat(String(point?.top ?? ''))
        if (!Number.isFinite(top)) return null
        return { top: `${top}%` }
      })
      .filter(Boolean)
  }, [theme.layout.positions, levels.length])

  const stepLadder = useMemo(
    () => theme.layout.stepLadder ?? DEFAULT_STEP_LADDER,
    [theme.id],
  )
  const layoutOptions = useMemo(
    () => ({
      useStageHeightForMan: Boolean(theme.layout.useStageHeightForMan),
    }),
    [theme.layout.useStageHeightForMan],
  )
  const stageRef = useRef(null)
  const [positions, setPositions] = useState(() =>
    customPositions ?? getRightColumnPositionsPercent(levels.length),
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
    stageWidth: 0,
    isNarrow: false,
  })
  const prevStatusRef = useRef({})
  const initializedRef = useRef(false)
  const unlockTimersRef = useRef([])
  const [unlockingIds, setUnlockingIds] = useState(() => new Set())

  const remeasureLayout = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const ladder =
      stage.clientWidth < NARROW_STAGE_WIDTH
        ? { ...stepLadder, ...NARROW_LADDER }
        : stepLadder

    requestAnimationFrame(() => {
      setColumnMetrics(measureLayoutWithBackdrop(stage, ladder, layoutOptions))
      requestAnimationFrame(() => {
        setColumnMetrics(measureLayoutWithBackdrop(stage, ladder, layoutOptions))
      })
    })
  }, [stepLadder, layoutOptions])

  useEffect(() => {
    if (theme.assets.completedCharacterIcon) {
      const img = new Image()
      img.src = `${publicUrl(theme.assets.completedCharacterIcon)}?v=2`
    }
    levels.forEach((level) => {
      if (!level.characterIcon) return
      const img = new Image()
      img.src = `${publicUrl(level.characterIcon)}?v=2`
    })
  }, [levels, theme.assets.completedCharacterIcon])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const updatePositions = () => {
      const stageWidth = stage.clientWidth
      const ladder =
        stageWidth < NARROW_STAGE_WIDTH
          ? { ...stepLadder, ...NARROW_LADDER }
          : stepLadder
      setPositions(customPositions ?? measureStepPositions(levels.length, stage, ladder))
      requestAnimationFrame(() => {
        setColumnMetrics(measureLayoutWithBackdrop(stage, ladder, layoutOptions))
        requestAnimationFrame(() => {
          setColumnMetrics(measureLayoutWithBackdrop(stage, ladder, layoutOptions))
        })
      })
    }

    updatePositions()

    const observer = new ResizeObserver(updatePositions)
    observer.observe(stage)

    return () => {
      observer.disconnect()
    }
  }, [levels.length, stepLadder, theme.id, customPositions, layoutOptions])

  const allStepsCompleted = useMemo(
    () =>
      allModulesComplete ||
      (levels.length > 0 && levels.every((level) => level.status === 'completed')),
    [allModulesComplete, levels],
  )

  const activeCharacterLevel = useMemo(
    () =>
      levels.find(
        (level) =>
          level.characterIcon &&
          (level.status === 'active' || unlockingIds.has(level.id)),
      ),
    [levels, unlockingIds],
  )

  const completedCharacterIcon = theme.assets.completedCharacterIcon
  const showCompletedCharacter = Boolean(allStepsCompleted && completedCharacterIcon)
  const characterIcon = showCompletedCharacter
    ? completedCharacterIcon
    : activeCharacterLevel?.characterIcon
  const isCharacterUnlocking = activeCharacterLevel?.id
    ? unlockingIds.has(activeCharacterLevel.id)
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
  }, [positions, levels.length, characterIcon, remeasureLayout])

  useEffect(() => {
    if (!showCompletedCharacter) return undefined
    const frameId = requestAnimationFrame(() => {
      remeasureLayout()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [showCompletedCharacter, remeasureLayout])

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

    if (columnMetrics.isNarrow) {
      return {
        '--factory-stage-bg-url': `url(${publicUrl(backgroundAsset)})`,
        left: '50%',
        width: 'calc(100% - 12px)',
        maxWidth: `${Math.max(0, columnMetrics.stageWidth - 12)}px`,
        transform: 'translateX(-50%)',
      }
    }

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

    const mapWidth = columnMetrics.stageWidth || columnMetrics.groupWidth
    const width = Math.min(
      columnMetrics.groupWidth + STAGE_BACKDROP_PADDING_X * 2,
      Math.max(0, mapWidth - 8),
    )
    const left = Math.min(
      Math.max(
        4,
        columnMetrics.stageOffsetLeft +
          Math.max(0, columnMetrics.manLeft - STAGE_BACKDROP_PADDING_X),
      ),
      Math.max(4, mapWidth - width - 4),
    )

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
    columnMetrics.stageWidth,
    columnMetrics.isNarrow,
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
        {characterIcon ? (
          <div
            className={[
              'factory-safety-character-slot',
              showCompletedCharacter ? 'factory-safety-character-slot--completed' : '',
              isCharacterUnlocking ? 'factory-safety-character-slot--enter' : '',
              showCompletedCharacter ? '' : 'factory-safety-character-slot--active',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <img
              src={`${publicUrl(characterIcon)}?v=${showCompletedCharacter ? 3 : 2}`}
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
